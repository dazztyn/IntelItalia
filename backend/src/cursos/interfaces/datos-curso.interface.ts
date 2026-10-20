import { Types } from 'mongoose';
import { Nivel } from '../niveles';

export interface DatosCurso {
  anio: number;
  nivel: Nivel;
  letra?: string | null;
  asignaturaIds?: Types.ObjectId[];
}