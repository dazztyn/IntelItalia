import { Types } from 'mongoose';
import {
  TipoEvaluacion,
  TipoEvaluacionDocument,
} from '../schemas/tipo-evaluacion.schema';
import { DatosResultado } from '../interfaces/datos-resultado.interface';
import { ResultadoEvaluacionPopulado } from '../interfaces/resultado-evaluacion-populado.interface';

export abstract class EvaluacionesRepository {
  abstract asegurarTiposIniciales(tipos: TipoEvaluacion[]): Promise<number>;
  abstract buscarTipoPorCodigo(
    codigo: string,
  ): Promise<TipoEvaluacionDocument | null>;
  abstract guardarResultado(datos: DatosResultado): Promise<void>;
  abstract listarPorAlumno(
    alumnoId: Types.ObjectId,
  ): Promise<ResultadoEvaluacionPopulado[]>;
}
