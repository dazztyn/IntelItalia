import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlumnoDocument } from '../../alumnos/alumno.schema';
import { AlumnosService } from '../../alumnos/alumnos.service';
import type { UsuarioAutorizado } from '../../comun/autorizacion';
import { claveNombre } from '../../comun/texto';
import { CursoDocument } from '../../cursos/curso.schema';
import { CursosService } from '../../cursos/cursos.service';
import { nombreCurso } from '../../cursos/niveles';
import { tieneAccesoACurso } from '../../usuarios/alcance';
import type { Permiso } from '../../usuarios/permisos';
import { CargaDto } from '../dto/carga.dto';
import { ArchivoSubido } from '../interfaces/archivo-subido.interface';
import {
  DatosParseados,
  EstrategiaCarga,
  FilaAprobada,
  FilaExtraida,
  ResultadoProcesamientoCarga,
} from './estrategia-carga.interface';
import {
  DatosFilaVistaPrevia,
  FilaVistaPrevia,
  VistaPrevia,
} from '../interfaces/vista-previa.interface';
import { AliasNombresRepository } from '../repositorios/alias-nombres.repository';
import { ErrorFila, FuenteCarga } from '../schemas/carga.schema';

export abstract class ProcesadorCargaBase<
  TDatos,
  TMeta,
> implements EstrategiaCarga {
  abstract readonly fuente: FuenteCarga;
  abstract readonly permiso: Permiso;
  abstract readonly extension: string;

  constructor(
    protected readonly cursosService: CursosService,
    protected readonly alumnosService: AlumnosService,
    protected readonly aliasRepo: AliasNombresRepository,
  ) {}

  protected abstract parsear(
    archivo: ArchivoSubido,
    dto: CargaDto,
  ): Promise<DatosParseados<TDatos, TMeta>>;

  /** `resultados` es lo que se guarda; los otros dos campos solo los llena el DIA. */
  protected abstract armarDatosVistaPrevia(datos: TDatos): DatosFilaVistaPrevia;

  protected abstract guardarFilas(
    filasAprobadas: FilaAprobada<TDatos>[],
    curso: CursoDocument,
    anio: number,
    cargaId: Types.ObjectId,
    meta: TMeta,
  ): Promise<void>;

  async previsualizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ): Promise<VistaPrevia> {
    const { vistaPrevia } = await this.analizar(archivo, dto, usuario);
    return vistaPrevia;
  }

  async procesarConfirmacion(
    archivo: ArchivoSubido,
    dto: CargaDto,
    resoluciones: Record<string, string | null>,
    usuario: UsuarioAutorizado,
    cargaId: Types.ObjectId,
  ): Promise<ResultadoProcesamientoCarga> {
    const { vistaPrevia, curso, meta, filasExtraidas } = await this.analizar(
      archivo,
      dto,
      usuario,
    );

    const matriculadosActivos = await this.alumnosService.listarPorCurso(
      curso._id,
      vistaPrevia.anio,
    );

    const matriculadosIds = new Set(
      matriculadosActivos.map((a) => String(a._id)),
    );

    const mapaFilasOriginales = new Map(filasExtraidas.map((f) => [f.fila, f]));
    const errores: ErrorFila[] = [];
    const guardados = new Set<string>();
    const filasAprobadas: FilaAprobada<TDatos>[] = [];

    for (const fila of vistaPrevia.filas) {
      const registrarError = (campo: string, mensaje: string) =>
        errores.push({ fila: fila.fila, campo, mensaje });

      if (fila.estado === 'error') {
        registrarError('porcentajes', fila.mensaje ?? 'Fila inválida');
        continue;
      }
      if (fila.estado === 'sinResultado') continue;

      const resuelta = String(fila.fila) in resoluciones;
      const alumnoId = resuelta
        ? resoluciones[String(fila.fila)]
        : fila.alumnoId;

      if (alumnoId === null) {
        if (!resuelta) {
          registrarError(
            'nombre',
            fila.estado === 'ambiguo'
              ? 'Más de un alumno coincide: elegir en la vista previa'
              : 'No se encontró al alumno en el curso: elegir en la vista previa',
          );
        }
        continue;
      }

      if (resuelta && !matriculadosIds.has(alumnoId)) {
        registrarError(
          'nombre',
          'El alumno elegido no está matriculado en el curso',
        );
        continue;
      }
      if (guardados.has(alumnoId)) {
        registrarError(
          'nombre',
          'El alumno ya aparece en otra fila del archivo',
        );
        continue;
      }

      const filaOriginal = mapaFilasOriginales.get(fila.fila);
      if (filaOriginal) {
        filasAprobadas.push({ filaOriginal, alumnoId });
        guardados.add(alumnoId);
      }
    }

    if (filasAprobadas.length > 0) {
      await this.guardarFilas(
        filasAprobadas,
        curso,
        vistaPrevia.anio,
        cargaId,
        meta,
      );
    }

    // Recuerda lo que el usuario eligió, para no preguntarlo en la próxima carga.
    // Las filas descartadas (`null`) no crean alias.
    for (const fila of vistaPrevia.filas) {
      const elegido = resoluciones[String(fila.fila)];
      if (!elegido || elegido === fila.alumnoId || !guardados.has(elegido)) {
        continue;
      }
      await this.aliasRepo.guardar({
        fuente: this.fuente,
        cursoId: curso._id,
        clave: claveNombre(fila.nombre),
        alumnoId: new Types.ObjectId(elegido),
        creadoPor: usuario.id,
      });
    }

    return {
      cursoId: curso._id,
      anio: vistaPrevia.anio,
      momento: vistaPrevia.momento,
      area: vistaPrevia.area,
      filasTotales: vistaPrevia.filas.length,
      filasOk: guardados.size,
      errores,
    };
  }

  private async analizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ) {
    const parseado = await this.parsear(archivo, dto);

    const resultado = await this.cursosService.resolverCurso(
      parseado.anio,
      parseado.nivel,
      parseado.letra,
    );

    if (resultado.estado !== 'encontrado') {
      const nombre = nombreCurso(parseado.nivel, parseado.letra);
      throw new BadRequestException(
        resultado.estado === 'noExiste'
          ? `No existe el curso ${nombre} en ${parseado.anio}`
          : `Hay varios cursos de ${nombre} en ${parseado.anio} y la letra del archivo no coincide con ninguno`,
      );
    }

    const curso = resultado.curso;
    if (!tieneAccesoACurso(usuario, curso._id)) {
      throw new ForbiddenException('El curso del archivo no está asignado');
    }

    // Incluye todas las matrículas del curso y año (activas, retiradas y trasladadas),
    // igual que hacía buscarPorNombreEnCurso originalmente, pero en 1 sola consulta.
    const alumnosCurso = await this.alumnosService.listarTodosPorCurso(
      curso._id,
      parseado.anio,
    );
    const mapaPorNombre = new Map<string, AlumnoDocument[]>();

    for (const alumno of alumnosCurso) {
      const lista = mapaPorNombre.get(alumno.nombreNormalizado) ?? [];
      lista.push(alumno);
      mapaPorNombre.set(alumno.nombreNormalizado, lista);
    }

    const porId = new Map(alumnosCurso.map((a) => [String(a._id), a]));
    const alias = await this.aliasRepo.listarPorFuenteYCurso(
      this.fuente,
      curso._id,
    );

    const filas = parseado.filas.map((fila) =>
      this.identificar(fila, mapaPorNombre, porId, alias),
    );

    const vistaPrevia: VistaPrevia = {
      curso: { id: String(curso._id), nombre: curso.nombre },
      anio: parseado.anio,
      area: parseado.area,
      momento: dto.momento,
      ejes: parseado.ejes,
      filas,
    };

    return {
      vistaPrevia,
      curso,
      meta: parseado.meta,
      filasExtraidas: parseado.filas,
    };
  }

  /**
   * Identifica al alumno de una fila (sección 6.2): primero por lo que alguien
   * resolvió en una carga anterior (alias) y, si no, por nombre.
   */
  private identificar(
    fila: FilaExtraida<TDatos>,
    mapaPorNombre: Map<string, AlumnoDocument[]>,
    porId: Map<string, AlumnoDocument>,
    alias: Map<string, string>,
  ): FilaVistaPrevia {
    const base = {
      fila: fila.fila,
      numeroLista: fila.numeroLista,
      nombre: fila.nombre,
      ...this.armarDatosVistaPrevia(fila.datos),
      alumnoId: null,
      candidatos: [],
    };

    if (fila.error) return { ...base, estado: 'error', mensaje: fila.error };
    if (fila.sinResultado) return { ...base, estado: 'sinResultado' };

    const clave = claveNombre(fila.nombre);
    // El alias solo vale mientras el alumno siga matriculado en el curso ese año.
    const recordado = porId.get(alias.get(clave) ?? '');
    if (recordado) {
      const candidato = comoCandidato(recordado);
      return {
        ...base,
        estado: 'encontrado',
        alumnoId: candidato.id,
        candidatos: [candidato],
        porAlias: true,
      };
    }

    const candidatos = (mapaPorNombre.get(clave) ?? []).map(comoCandidato);

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

function comoCandidato(alumno: AlumnoDocument) {
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
