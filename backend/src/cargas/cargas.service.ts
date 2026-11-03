import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { CursoDocument } from '../cursos/curso.schema';
import { CursosService } from '../cursos/cursos.service';
import { nombreCurso } from '../cursos/niveles';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';
import { tieneAccesoACurso } from '../usuarios/alcance';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';
import {
  FilaDia,
  FormatoInvalidoError,
  parsearDia,
} from './parsers/dia.parser';
import { Carga, CargaDocument, ErrorFila } from './schemas/carga.schema';

/** Lo que se necesita del archivo subido (multer lo deja en memoria). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
}

export type EstadoFila =
  'encontrado' | 'ambiguo' | 'noEncontrado' | 'sinResultado' | 'error';

export interface FilaVistaPrevia {
  fila: number;
  numeroLista: number | null;
  /** Nombre como viene en el archivo, para que el usuario resuelva; no se guarda. */
  nombre: string;
  estado: EstadoFila;
  /** Alumno identificado (solo con estado `encontrado`). */
  alumnoId: string | null;
  candidatos: Array<{ id: string; nombreCompleto: string }>;
  porcentajesPorEje: Record<string, number> | null;
  porcentajeLogro: number | null;
  mensaje?: string;
}

export interface VistaPrevia {
  curso: { id: string; nombre: string };
  anio: number;
  area: 'lenguaje' | 'matematica';
  momento: string;
  ejes: string[];
  filas: FilaVistaPrevia[];
}

// Carga del DIA (docs/ARQUITECTURA.md, sección 6). Se procesa dentro de la petición:
// un archivo trae ~25 filas. shortcut: sin BullMQ ni avance por partes; pasar a la
// cola `procesarCarga` cuando lleguen archivos grandes (Mi Aula de toda la escuela).
@Injectable()
export class CargasService {
  constructor(
    @InjectModel(Carga.name) private readonly cargaModel: Model<Carga>,
    private readonly cursosService: CursosService,
    private readonly alumnosService: AlumnosService,
    private readonly evaluacionesService: EvaluacionesService,
    private readonly eventos: EventEmitter2,
  ) {}

  /** Lee el archivo e identifica a cada alumno, sin guardar nada. */
  async previsualizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ): Promise<VistaPrevia> {
    const { vistaPrevia } = await this.analizar(archivo, dto, usuario);
    return vistaPrevia;
  }

  /**
   * Vuelve a leer el mismo archivo, aplica lo que el usuario resolvió en la vista
   * previa y guarda los resultados. Recargar el archivo actualiza, no duplica.
   */
  async confirmar(
    archivo: ArchivoSubido,
    dto: ConfirmarCargaDto,
    usuario: UsuarioAutorizado,
    ip: string,
  ) {
    const resoluciones = leerResoluciones(dto.resoluciones);
    const iniciadaEn = new Date();
    const { vistaPrevia, curso, tipoId } = await this.analizar(
      archivo,
      dto,
      usuario,
    );

    const matriculados = new Set(
      (
        await this.alumnosService.listarPorCurso(curso._id, vistaPrevia.anio)
      ).map((alumno) => String(alumno._id)),
    );
    const cargaId = new Types.ObjectId();
    const errores: ErrorFila[] = [];
    const guardados = new Set<string>();

    for (const fila of vistaPrevia.filas) {
      const error = (campo: string, mensaje: string) =>
        errores.push({ fila: fila.fila, campo, mensaje });

      if (fila.estado === 'error') {
        error('porcentajes', fila.mensaje ?? 'Fila inválida');
        continue;
      }
      if (fila.estado === 'sinResultado') continue;

      const resuelta = String(fila.fila) in resoluciones;
      const alumnoId = resuelta
        ? resoluciones[String(fila.fila)]
        : fila.alumnoId;
      if (alumnoId === null) {
        // `null` en las resoluciones = el usuario descartó la fila.
        if (!resuelta) {
          error(
            'nombre',
            fila.estado === 'ambiguo'
              ? 'Más de un alumno coincide: elegir en la vista previa'
              : 'No se encontró al alumno en el curso: elegir en la vista previa',
          );
        }
        continue;
      }
      if (resuelta && !matriculados.has(alumnoId)) {
        error('nombre', 'El alumno elegido no está matriculado en el curso');
        continue;
      }
      if (guardados.has(alumnoId)) {
        error('nombre', 'El alumno ya aparece en otra fila del archivo');
        continue;
      }

      await this.evaluacionesService.guardarResultado({
        alumnoId: new Types.ObjectId(alumnoId),
        tipoEvaluacionId: tipoId,
        cursoId: curso._id,
        anio: vistaPrevia.anio,
        momento: vistaPrevia.momento,
        area: vistaPrevia.area,
        resultados: {
          porcentajesPorEje: fila.porcentajesPorEje,
          porcentajeLogro: fila.porcentajeLogro,
        },
        nivelNormalizado: null, // ⏳ cortes del DIA por definir (sección 4.3)
        cargaId,
      });
      guardados.add(alumnoId);
    }

    const carga = await this.cargaModel.create({
      _id: cargaId,
      fuente: dto.fuente,
      nombreArchivo: archivo.originalname.slice(0, 200),
      usuarioId: usuario.id,
      cursoId: curso._id,
      anio: vistaPrevia.anio,
      momento: vistaPrevia.momento,
      area: vistaPrevia.area,
      estado:
        errores.length === 0
          ? 'completada'
          : guardados.size === 0
            ? 'fallida'
            : 'completadaConErrores',
      filasTotales: vistaPrevia.filas.length,
      filasOk: guardados.size,
      errores,
      iniciadaEn,
      finalizadaEn: new Date(),
    });

    this.eventos.emit('auditoria.acceso', {
      usuarioId: usuario.id,
      accion: 'carga.crear',
      recurso: 'cargas',
      recursoId: String(cargaId),
      ip,
      fecha: new Date(),
    });

    return detalleCarga(carga);
  }

  // shortcut: últimas 50 cargas sin paginar ni filtrar; agregar filtros cuando haya muchas.
  async listar() {
    const cargas = await this.cargaModel
      .find()
      .sort({ iniciadaEn: -1 })
      .limit(50)
      .exec();
    return cargas.map(resumenCarga);
  }

  async obtener(id: Types.ObjectId) {
    const carga = await this.cargaModel.findById(id).exec();
    if (!carga) throw new NotFoundException('La carga no existe');
    return detalleCarga(carga);
  }

  private async analizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ) {
    const tipo = await this.evaluacionesService.buscarTipoPorCodigo('DIA');
    if (!tipo) throw new Error('Falta el tipo de evaluación DIA');
    if (!tipo.momentos.includes(dto.momento)) {
      throw new BadRequestException(
        `momento inválido; usar: ${tipo.momentos.join(', ')}`,
      );
    }

    let dia: Awaited<ReturnType<typeof parsearDia>>;
    try {
      dia = await parsearDia(archivo.buffer);
    } catch (error) {
      if (error instanceof FormatoInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const resultado = await this.cursosService.resolverCurso(
      dia.anio,
      dia.nivel,
      dia.letra,
    );
    if (resultado.estado !== 'encontrado') {
      const nombre = nombreCurso(dia.nivel, dia.letra);
      throw new BadRequestException(
        resultado.estado === 'noExiste'
          ? `No existe el curso ${nombre} en ${dia.anio}`
          : `Hay varios cursos de ${nombre} en ${dia.anio} y la letra del archivo no coincide con ninguno`,
      );
    }
    const curso = resultado.curso;
    // Alcance por curso (sección 6.2): el archivo es de un solo curso.
    if (!tieneAccesoACurso(usuario, curso._id)) {
      throw new ForbiddenException('El curso del archivo no está asignado');
    }

    const filas = await Promise.all(
      dia.filas.map((fila) => this.identificar(fila, curso, dia.anio)),
    );
    const vistaPrevia: VistaPrevia = {
      curso: { id: String(curso._id), nombre: curso.nombre },
      anio: dia.anio,
      area: dia.area,
      momento: dto.momento,
      ejes: dia.ejes,
      filas,
    };
    return { vistaPrevia, curso, tipoId: tipo._id };
  }

  /** Busca al alumno por nombre entre los matriculados del curso (sección 6.2). */
  private async identificar(
    fila: FilaDia,
    curso: CursoDocument,
    anio: number,
  ): Promise<FilaVistaPrevia> {
    const base = {
      fila: fila.fila,
      numeroLista: fila.numeroLista,
      nombre: fila.nombre,
      porcentajesPorEje: fila.porcentajesPorEje,
      porcentajeLogro: fila.porcentajeLogro,
      alumnoId: null,
      candidatos: [],
    };
    if (fila.error) return { ...base, estado: 'error', mensaje: fila.error };
    if (!fila.porcentajesPorEje) return { ...base, estado: 'sinResultado' };

    const encontrados = await this.alumnosService.buscarPorNombreEnCurso(
      fila.nombre,
      curso._id,
      anio,
    );
    const candidatos = encontrados.map((alumno) => ({
      id: String(alumno._id),
      nombreCompleto: [
        alumno.nombres,
        alumno.apellidoPaterno,
        alumno.apellidoMaterno,
      ]
        .filter(Boolean)
        .join(' '),
    }));
    if (candidatos.length === 1) {
      return {
        ...base,
        estado: 'encontrado',
        alumnoId: candidatos[0].id,
        candidatos,
      };
    }
    return {
      ...base,
      estado: candidatos.length === 0 ? 'noEncontrado' : 'ambiguo',
      candidatos,
    };
  }
}

/** `{ "<fila>": "<alumnoId>" | null }`; cualquier otra forma es un 400. */
function leerResoluciones(json?: string): Record<string, string | null> {
  if (!json) return {};
  let valor: unknown;
  try {
    valor = JSON.parse(json);
  } catch {
    throw new BadRequestException('resoluciones no es un JSON válido');
  }
  const esValido =
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor) &&
    Object.entries(valor).every(
      ([fila, id]) =>
        /^\d+$/.test(fila) && (id === null || isObjectIdOrHexString(id)),
    );
  if (!esValido) {
    throw new BadRequestException(
      'resoluciones debe ser { "<fila>": "<alumnoId>" | null }',
    );
  }
  return valor as Record<string, string | null>;
}

function resumenCarga(carga: CargaDocument) {
  return {
    id: String(carga._id),
    fuente: carga.fuente,
    nombreArchivo: carga.nombreArchivo,
    cursoId: String(carga.cursoId),
    anio: carga.anio,
    momento: carga.momento,
    area: carga.area,
    estado: carga.estado,
    filasTotales: carga.filasTotales,
    filasOk: carga.filasOk,
    iniciadaEn: carga.iniciadaEn,
    finalizadaEn: carga.finalizadaEn,
  };
}

function detalleCarga(carga: CargaDocument) {
  return {
    ...resumenCarga(carga),
    errores: carga.errores.map(({ fila, campo, mensaje }) => ({
      fila,
      campo,
      mensaje,
    })),
  };
}
