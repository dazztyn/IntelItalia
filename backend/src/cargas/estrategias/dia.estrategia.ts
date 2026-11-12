import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlumnosService } from '../../alumnos/alumnos.service';
import { Area } from '../../asignaturas/asignatura.schema';
import { CursoDocument } from '../../cursos/curso.schema';
import { CursosService } from '../../cursos/cursos.service';
import { EvaluacionesService } from '../../evaluaciones/evaluaciones.service';
import { CargaDto } from '../dto/carga.dto';
import { ArchivoSubido } from '../interfaces/archivo-subido.interface';
import {
  DatosParseados,
  FilaAprobada,
  FilaExtraida,
} from './estrategia-carga.interface';
import { DatosDia, MetaDia } from '../interfaces/estrategia-dia.interface';
import { FilaVistaPrevia } from '../interfaces/vista-previa.interface';
import { FormatoInvalidoError, parsearDia } from '../parsers/dia.parser';
import { FuenteCarga } from '../schemas/carga.schema';
import { ProcesadorCargaBase } from './procesador-carga.base';

@Injectable()
export class DiaEstrategia extends ProcesadorCargaBase<DatosDia, MetaDia> {
  readonly fuente: FuenteCarga = 'dia';

  constructor(
    cursosService: CursosService,
    alumnosService: AlumnosService,
    private readonly evaluacionesService: EvaluacionesService,
  ) {
    super(cursosService, alumnosService);
  }

  protected async parsear(
    archivo: ArchivoSubido,
    dto: CargaDto,
  ): Promise<DatosParseados<DatosDia, MetaDia>> {
    const tipo = await this.evaluacionesService.buscarTipoPorCodigo('DIA');
    if (!tipo) throw new Error('Falta el tipo de evaluación DIA');
    if (!tipo.momentos.includes(dto.momento)) {
      throw new BadRequestException(
        `momento inválido; usar: ${tipo.momentos.join(', ')}`,
      );
    }

    try {
      const dia = await parsearDia(archivo.buffer);

      const filas: FilaExtraida<DatosDia>[] = dia.filas.map((f) => ({
        fila: f.fila,
        numeroLista: f.numeroLista,
        nombre: f.nombre,
        error: f.error,
        sinResultado: !f.porcentajesPorEje,
        datos: {
          porcentajesPorEje: f.porcentajesPorEje,
          porcentajeLogro: f.porcentajeLogro,
        },
      }));

      return {
        anio: dia.anio,
        nivel: dia.nivel,
        letra: dia.letra,
        area: dia.area,
        ejes: dia.ejes,
        filas,
        meta: {
          tipoId: tipo._id,
          momento: dto.momento,
          area: dia.area,
        },
      };
    } catch (error) {
      if (error instanceof FormatoInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  protected armarDatosVistaPrevia(
    datos: DatosDia,
  ): Pick<FilaVistaPrevia, 'porcentajesPorEje' | 'porcentajeLogro'> {
    return {
      porcentajesPorEje: datos.porcentajesPorEje,
      porcentajeLogro: datos.porcentajeLogro,
    };
  }

  protected async guardarFilas(
    filasAprobadas: FilaAprobada<DatosDia>[],
    curso: CursoDocument,
    anio: number,
    cargaId: Types.ObjectId,
    meta: MetaDia,
  ): Promise<void> {
    await Promise.all(
      filasAprobadas.map(({ filaOriginal, alumnoId }) =>
        this.evaluacionesService.guardarResultado({
          alumnoId: new Types.ObjectId(alumnoId),
          tipoEvaluacionId: meta.tipoId,
          cursoId: curso._id,
          anio,
          momento: meta.momento,
          area: meta.area as Area,
          resultados: {
            porcentajesPorEje: filaOriginal.datos.porcentajesPorEje,
            porcentajeLogro: filaOriginal.datos.porcentajeLogro,
          },
          nivelNormalizado: null,
          cargaId,
        }),
      ),
    );
  }
}
