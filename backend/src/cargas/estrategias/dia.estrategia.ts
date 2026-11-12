import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Area } from '../../asignaturas/asignatura.schema';
import { CursoDocument } from '../../cursos/curso.schema';
import { EvaluacionesService } from '../../evaluaciones/evaluaciones.service';
import { CargaDto } from '../dto/carga.dto';
import { ArchivoSubido } from '../interfaces/archivo-subido.interface';
import { FormatoInvalidoError, parsearDia } from '../parsers/dia.parser';
import { DatosParseados, EstrategiaCarga, FilaExtraida } from './estrategia-carga.interface';
import { DatosDia, MetaDia } from '../interfaces/estrategia-dia.interface';
    
@Injectable()
export class DiaEstrategia implements EstrategiaCarga<DatosDia, MetaDia> {
  readonly fuente = 'dia';

  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  async parsear(archivo: ArchivoSubido, dto: CargaDto): Promise<DatosParseados<DatosDia, MetaDia>> {
    const tipo = await this.evaluacionesService.buscarTipoPorCodigo('DIA');
    if (!tipo) throw new Error('Falta el tipo de evaluación DIA');
    if (!tipo.momentos.includes(dto.momento)) {
      throw new BadRequestException(`momento inválido; usar: ${tipo.momentos.join(', ')}`);
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
        meta: { tipoId: tipo._id as Types.ObjectId, momento: dto.momento, area: dia.area },
      };
    } catch (error) {
      if (error instanceof FormatoInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async guardar(
    filasAprobadas: Array<{ filaOriginal: FilaExtraida<DatosDia>; alumnoId: string }>,
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
          cursoId: curso._id as Types.ObjectId,
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