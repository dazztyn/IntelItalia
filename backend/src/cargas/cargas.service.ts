import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { CursosService } from '../cursos/cursos.service';
import { Nivel, nombreCurso } from '../cursos/niveles';
import { tieneAccesoACurso } from '../usuarios/alcance';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';
import { ArchivoSubido } from './interfaces/archivo-subido.interface';
import { EstadoFila, FilaVistaPrevia, VistaPrevia } from './interfaces/vista-previa.interface';
import { CargasRepository } from './repositorios/cargas.repository';
import { EstrategiaCarga, FilaExtraida } from './estrategias/estrategia-carga.interface';
import { DiaEstrategia } from './estrategias/dia.estrategia';
import { CargaDocument, ErrorFila } from './schemas/carga.schema';
import { claveNombre } from 'src/comun/texto';

@Injectable()
export class CargasService {
  // El mapa donde registraremos todas las estrategias (DIA, Letrapps, MiAula...)
  private readonly estrategias = new Map<string, EstrategiaCarga>();

  constructor(
    private readonly cargasRepo: CargasRepository,
    private readonly cursosService: CursosService,
    private readonly alumnosService: AlumnosService,
    private readonly diaEstrategia: DiaEstrategia,
    private readonly eventos: EventEmitter2,
  ) {
    // Registramos la estrategia en el orquestador
    this.estrategias.set(this.diaEstrategia.fuente, this.diaEstrategia);
  }

  private obtenerEstrategia(fuente: string): EstrategiaCarga {
    const estrategia = this.estrategias.get(fuente);
    if (!estrategia) {
      throw new BadRequestException(`Fuente de carga no soportada: ${fuente}`);
    }
    return estrategia;
  }

  async previsualizar(archivo: ArchivoSubido, dto: CargaDto, usuario: UsuarioAutorizado): Promise<VistaPrevia> {
    const { vistaPrevia } = await this.analizar(archivo, dto, usuario);
    return vistaPrevia;
  }

  async confirmar(archivo: ArchivoSubido, dto: ConfirmarCargaDto, usuario: UsuarioAutorizado, ip: string) {
    const estrategia = this.obtenerEstrategia(dto.fuente);
    const resoluciones = leerResoluciones(dto.resoluciones);
    const iniciadaEn = new Date();
    
    // analizamos el archivo usando la estrategia genérica
    const { vistaPrevia, curso, meta, filasExtraidas } = await this.analizar(archivo, dto, usuario);

    const matriculados = new Set(
      (await this.alumnosService.listarPorCurso(curso._id as Types.ObjectId, vistaPrevia.anio))
        .map((alumno) => String(alumno._id)),
    );
    
    const cargaId = new Types.ObjectId();
    const errores: ErrorFila[] = [];
    const guardados = new Set<string>();
    const filasAprobadas: Array<{ filaOriginal: FilaExtraida; alumnoId: string }> = [];

    // Validamos y aprobamos filas
    for (const fila of vistaPrevia.filas) {
      const error = (campo: string, mensaje: string) => errores.push({ fila: fila.fila, campo, mensaje });

      if (fila.estado === 'error') {
        error('datos', fila.mensaje ?? 'Fila inválida');
        continue;
      }
      if (fila.estado === 'sinResultado') continue;

      const resuelta = String(fila.fila) in resoluciones;
      const alumnoId = resuelta ? resoluciones[String(fila.fila)] : fila.alumnoId;
      
      if (alumnoId === null) {
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

      // Asociamos la fila parseada original con el alumno válido
      const filaOriginal = filasExtraidas.find(f => f.fila === fila.fila);
      if (filaOriginal) {
        filasAprobadas.push({ filaOriginal, alumnoId });
        guardados.add(alumnoId);
      }
    }

    // DELEGAMOS EL GUARDADO A LA ESTRATEGIA (Si hay aprobados)
    if (filasAprobadas.length > 0) {
      await estrategia.guardar(filasAprobadas, curso, vistaPrevia.anio, cargaId, meta);
    }

    const carga = await this.cargasRepo.crear({
      _id: cargaId,
      fuente: dto.fuente as any, // TypeScript compatibility with mongoose schema enum
      nombreArchivo: archivo.originalname.slice(0, 200),
      usuarioId: usuario.id,
      cursoId: curso._id as Types.ObjectId,
      anio: vistaPrevia.anio,
      momento: vistaPrevia.momento,
      area: vistaPrevia.area,
      estado: errores.length === 0 ? 'completada' : guardados.size === 0 ? 'fallida' : 'completadaConErrores',
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

  async listar() {
    const cargas = await this.cargasRepo.listarRecientes(50);
    return cargas.map(resumenCarga);
  }

  async obtener(id: Types.ObjectId) {
    const carga = await this.cargasRepo.buscarPorId(id);
    if (!carga) throw new NotFoundException('La carga no existe');
    return detalleCarga(carga);
  }

  private async analizar(archivo: ArchivoSubido, dto: CargaDto, usuario: UsuarioAutorizado) {
    const estrategia = this.obtenerEstrategia(dto.fuente);
    
    // DELEGAMOS EL PARSEO A LA ESTRATEGIA
    const parseado = await estrategia.parsear(archivo, dto);

    const resultado = await this.cursosService.resolverCurso(
      parseado.anio,
      parseado.nivel as Nivel,
      parseado.letra,
    );
    
    if (resultado.estado !== 'encontrado') {
      const nombre = nombreCurso(parseado.nivel as Nivel, parseado.letra);
      throw new BadRequestException(
        resultado.estado === 'noExiste'
          ? `No existe el curso ${nombre} en ${parseado.anio}`
          : `Hay varios cursos de ${nombre} en ${parseado.anio} y la letra del archivo no coincide con ninguno`,
      );
    }
    
    const curso = resultado.curso;
    if (!tieneAccesoACurso(usuario, curso._id as Types.ObjectId)) {
      throw new ForbiddenException('El curso del archivo no está asignado');
    }

    // AQUI TAMBIEN IMPLEMENTAMOS LA OPTIMIZACION O(1) EN MEMORIA EN VEZ DE CONSULTAR MONGODB EN UN BUCLE
    const matriculados = await this.alumnosService.listarPorCurso(curso._id as Types.ObjectId, parseado.anio);
    
    const filas = parseado.filas.map((fila) => this.identificar(fila, matriculados));
    
    const vistaPrevia: VistaPrevia = {
      curso: { id: String(curso._id), nombre: curso.nombre },
      anio: parseado.anio,
      area: parseado.area as 'lenguaje' | 'matematica',
      momento: dto.momento,
      ejes: parseado.ejes,
      filas,
    };
    
    return { vistaPrevia, curso, meta: parseado.meta, filasExtraidas: parseado.filas };
  }

  // Ahora cruza nombres usando el arreglo en memoria en tiempo O(1) en vez de pegarle a Mongo
  private identificar(fila: FilaExtraida, matriculados: any[]): FilaVistaPrevia {
    const base = {
      fila: fila.fila,
      numeroLista: fila.numeroLista,
      nombre: fila.nombre,
      porcentajesPorEje: fila.datos?.porcentajesPorEje ?? null,
      porcentajeLogro: fila.datos?.porcentajeLogro ?? null,
      alumnoId: null,
      candidatos: [],
    };
    
    if (fila.error) return { ...base, estado: 'error', mensaje: fila.error };
    if (fila.sinResultado) return { ...base, estado: 'sinResultado' };

    // Búsqueda en memoria
    const nombreNormalizadoFila = claveNombre(fila.nombre); // Reemplaza por tu función `claveNombre`
    const encontrados = matriculados.filter(a => a.nombreNormalizado === nombreNormalizadoFila);
    
    const candidatos = encontrados.map((alumno) => ({
      id: String(alumno._id),
      nombreCompleto: [alumno.nombres, alumno.apellidoPaterno, alumno.apellidoMaterno].filter(Boolean).join(' '),
    }));
    
    if (candidatos.length === 1) {
      return { ...base, estado: 'encontrado', alumnoId: candidatos[0].id, candidatos };
    }
    
    return { ...base, estado: candidatos.length === 0 ? 'noEncontrado' : 'ambiguo', candidatos };
  }
}

// Funciones utilitarias al fondo del archivo
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
      ([fila, id]) => /^\d+$/.test(fila) && (id === null || isObjectIdOrHexString(id)),
    );
  if (!esValido) {
    throw new BadRequestException('resoluciones debe ser { "<fila>": "<alumnoId>" | null }');
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
    errores: carga.errores.map(({ fila, campo, mensaje }) => ({ fila, campo, mensaje })),
  };
}

// Helper auxiliar para simular claveNombre si no está importado globalmente
function normalizarNombre(nombre: string): string {
  return nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-ZÑ0-9]+/g, ' ').trim().split(' ').sort().join(' ');
}