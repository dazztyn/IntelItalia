import { ResultadoEvaluacionDocument } from '../schemas/resultado-evaluacion.schema';
import { TipoEvaluacion } from '../schemas/tipo-evaluacion.schema';

export type ResultadoEvaluacionPopulado = Omit<
  ResultadoEvaluacionDocument,
  'tipoEvaluacionId'
> & {
  tipoEvaluacionId: Pick<TipoEvaluacion, 'codigo' | 'nombre' | 'momentos'>;
};
