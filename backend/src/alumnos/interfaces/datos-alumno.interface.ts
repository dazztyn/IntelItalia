import { Types } from 'mongoose';
import { DatosPie, EstadoMatricula } from '../alumno.schema';

export interface DatosAlumno {
  rut?: string | null;
  ipe?: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  fechaNacimiento?: Date | null;
  matriculas?: Array<{
    anio: number;
    cursoId: Types.ObjectId;
    estado?: EstadoMatricula;
  }>;
  pie?: DatosPie;
}