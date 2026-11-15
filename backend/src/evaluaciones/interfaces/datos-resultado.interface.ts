import { Types } from 'mongoose';
import type { Area } from '../../asignaturas/asignatura.schema';
import { NivelNormalizado } from '../schemas/resultado-evaluacion.schema';

export interface DatosResultado {
  alumnoId: Types.ObjectId;
  tipoEvaluacionId: Types.ObjectId;
  cursoId: Types.ObjectId;
  anio: number;
  momento: string;
  area: Area;
  resultados: Record<string, unknown>;
  nivelNormalizado?: NivelNormalizado | null;
  cargaId?: Types.ObjectId | null;
}
