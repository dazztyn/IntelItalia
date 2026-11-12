import { DatosPie } from '../../alumnos/alumno.schema';

export interface AlumnoFicticio {
  rut: string | null;
  ipe: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  retirado: boolean;
  pie?: DatosPie;
}
