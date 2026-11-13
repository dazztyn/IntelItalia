import { Types } from 'mongoose';
import { AlumnoDocument, DatosPie } from '../alumno.schema';
import { DatosAlumno } from '../interfaces/datos-alumno.interface';

export abstract class AlumnosRepository {
  abstract crear(datos: DatosAlumno): Promise<AlumnoDocument>;
  abstract buscarPorId(id: Types.ObjectId): Promise<AlumnoDocument | null>;
  abstract buscarPorRut(rutNormalizado: string): Promise<AlumnoDocument | null>;
  abstract buscarPorIpe(ipe: string): Promise<AlumnoDocument | null>;
  abstract listarPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]>;
  abstract listarTodosPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]>;
  abstract buscarPorNombreEnCurso(
    claveNombre: string,
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]>;
  abstract obtenerDatosPie(
    alumnoId: Types.ObjectId,
  ): Promise<DatosPie | undefined>;
}
