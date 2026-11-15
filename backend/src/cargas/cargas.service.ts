import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';
import { AlumnoDocument } from '../alumnos/alumno.schema';
import { AlumnosService } from '../alumnos/alumnos.service';
import type { Area } from '../asignaturas/asignatura.schema';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { claveNombre } from '../comun/texto';
import { CursoDocument } from '../cursos/curso.schema';
import { CursosService } from '../cursos/cursos.service';
import { nombreCurso } from '../cursos/niveles';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';
import { cursosPermitidos, tieneAccesoACurso } from '../usuarios/alcance';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';
import { DefinicionFuente, FilaLeida, FUENTES } from './fuentes';
import { FormatoInvalidoError } from './parsers/dia.parser';
import { AliasNombre } from './schemas/alias-nombre.schema';
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
  /** `true` si se identificó por lo que alguien resolvió en una carga anterior. */
  porAlias?: boolean;
  /** Resultado como se va a guardar; su forma depende de la fuente. */
  resultados: Record<string, unknown> | null;
  /** @deprecated Solo DIA: usar `resultados.porcentajesPorEje`. */
  porcentajesPorEje: Record<string, number> | null;
  /** @deprecated Solo DIA: usar `resultados.porcentajeLogro`. */
  porcentajeLogro: number | null;
  mensaje?: string;
}

export interface VistaPrevia {
  curso: { id: string; nombre: string };
  anio: number;
  area: Area;
  momento: string;
  ejes: string[];
  filas: FilaVistaPrevia[];
}

type Candidato = FilaVistaPrevia['candidatos'][number];

// Carga de evaluaciones externas (docs/ARQUITECTURA.md, sección 6). Cada fuente
// aporta su lector (fuentes.ts) y el flujo es común. Se procesa dentro de la petición:
// un archivo trae ~25 filas. shortcut: sin BullMQ ni avance por partes; pasar a la
// cola `procesarCarga` cuando lleguen archivos grandes (Mi Aula de toda la escuela).
@Injectable()
export class CargasService {
  constructor(
    @InjectModel(Carga.name) private readonly cargaModel: Model<Carga>,
    @InjectModel(AliasNombre.name)
    private readonly aliasModel: Model<AliasNombre>,
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
    const { vistaPrevia, curso, tipoId, matriculados } = await this.analizar(
      archivo,
      dto,
      usuario,
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
      if (!fila.resultados) continue; // sin resultado: el alumno no rindió

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
        resultados: fila.resultados,
        nivelNormalizado: null, // ⏳ criterios de normalización por definir (sección 4.3)
        cargaId,
      });
      guardados.add(alumnoId);

      // Recuerda lo que el usuario eligió, para no preguntarlo en la próxima carga.
      if (resuelta && alumnoId !== fila.alumnoId) {
        await this.aliasModel
          .updateOne(
            {
              fuente: dto.fuente,
              cursoId: curso._id,
              clave: claveNombre(fila.nombre),
            },
            { $set: { alumnoId, creadoPor: usuario.id } },
            { upsert: true },
          )
          .exec();
      }
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
  async listar(usuario: UsuarioAutorizado) {
    const cursoIds = cursosPermitidos(usuario);
    const cargas = await this.cargaModel
      .find({
        fuente: { $in: fuentesPermitidas(usuario) },
        ...(cursoIds ? { cursoId: { $in: cursoIds } } : {}),
      })
      .sort({ iniciadaEn: -1 })
      .limit(50)
      .exec();
    return cargas.map(resumenCarga);
  }

  async obtener(id: Types.ObjectId, usuario: UsuarioAutorizado) {
    const carga = await this.cargaModel.findById(id).exec();
    if (!carga) throw new NotFoundException('La carga no existe');
    if (
      !fuentesPermitidas(usuario).includes(carga.fuente) ||
      !tieneAccesoACurso(usuario, carga.cursoId)
    ) {
      throw new ForbiddenException();
    }
    return detalleCarga(carga);
  }

  private async analizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ) {
    const definicion: DefinicionFuente | undefined = FUENTES.find(
      ({ fuente }) => fuente === dto.fuente,
    );
    if (!definicion) {
      throw new BadRequestException('fuente no soportada todavía');
    }
    // El permiso depende de la fuente, así que se revisa aquí y no en el guard.
    if (!usuario.permisos.includes(definicion.permiso)) {
      throw new ForbiddenException();
    }
    if (!archivo.originalname.toLowerCase().endsWith(definicion.extension)) {
      throw new BadRequestException(
        `Solo se aceptan archivos ${definicion.extension}`,
      );
    }

    const tipo = await this.evaluacionesService.buscarTipoPorCodigo(
      definicion.tipoEvaluacion,
    );
    if (!tipo) {
      throw new Error(
        `Falta el tipo de evaluación ${definicion.tipoEvaluacion}`,
      );
    }
    if (!tipo.momentos.includes(dto.momento)) {
      throw new BadRequestException(
        `momento inválido; usar: ${tipo.momentos.join(', ')}`,
      );
    }

    let dia: Awaited<ReturnType<DefinicionFuente['leer']>>;
    try {
      dia = await definicion.leer(archivo.buffer);
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

    const matriculados = new Map<string, Candidato>(
      (await this.alumnosService.listarPorCurso(curso._id, dia.anio)).map(
        (alumno) => [String(alumno._id), comoCandidato(alumno)],
      ),
    );
    const alias = new Map(
      (
        await this.aliasModel
          .find({ fuente: dto.fuente, cursoId: curso._id })
          .exec()
      ).map(({ clave, alumnoId }) => [clave, String(alumnoId)]),
    );

    const filas = await Promise.all(
      dia.filas.map((fila) =>
        this.identificar(fila, curso, dia.anio, matriculados, alias),
      ),
    );
    const vistaPrevia: VistaPrevia = {
      curso: { id: String(curso._id), nombre: curso.nombre },
      anio: dia.anio,
      area: dia.area,
      momento: dto.momento,
      ejes: dia.ejes,
      filas,
    };
    return { vistaPrevia, curso, tipoId: tipo._id, matriculados };
  }

  /**
   * Identifica al alumno de una fila (sección 6.2): primero por lo que alguien
   * resolvió en una carga anterior (alias) y, si no, por nombre entre los
   * matriculados del curso.
   */
  private async identificar(
    fila: FilaLeida,
    curso: CursoDocument,
    anio: number,
    matriculados: Map<string, Candidato>,
    alias: Map<string, string>,
  ): Promise<FilaVistaPrevia> {
    const base = {
      fila: fila.fila,
      numeroLista: fila.numeroLista,
      nombre: fila.nombre,
      resultados: fila.resultados,
      porcentajesPorEje:
        (fila.resultados?.porcentajesPorEje as Record<string, number>) ?? null,
      porcentajeLogro: (fila.resultados?.porcentajeLogro as number) ?? null,
      alumnoId: null,
      candidatos: [],
    };
    if (fila.error) return { ...base, estado: 'error', mensaje: fila.error };
    if (!fila.resultados) return { ...base, estado: 'sinResultado' };

    // El alias solo vale mientras el alumno siga matriculado en el curso.
    const recordado = matriculados.get(
      alias.get(claveNombre(fila.nombre)) ?? '',
    );
    if (recordado) {
      return {
        ...base,
        estado: 'encontrado',
        alumnoId: recordado.id,
        candidatos: [recordado],
        porAlias: true,
      };
    }

    const candidatos = (
      await this.alumnosService.buscarPorNombreEnCurso(
        fila.nombre,
        curso._id,
        anio,
      )
    ).map(comoCandidato);
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

function comoCandidato(alumno: AlumnoDocument): Candidato {
  return {
    id: String(alumno._id),
    nombreCompleto: [
      alumno.nombres,
      alumno.apellidoPaterno,
      alumno.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/** Fuentes que el usuario puede cargar y consultar, según sus permisos. */
function fuentesPermitidas(usuario: UsuarioAutorizado): string[] {
  return FUENTES.filter(({ permiso }) =>
    usuario.permisos.includes(permiso),
  ).map(({ fuente }) => fuente);
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
