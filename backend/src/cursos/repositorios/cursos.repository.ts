import { Types } from 'mongoose';
import { CursoDocument } from '../curso.schema';
import { Nivel } from '../niveles';
import { DatosCurso } from '../interfaces/datos-curso.interface';

export abstract class CursosRepository {
  abstract crear(
    datos: DatosCurso & { letra?: string | null },
  ): Promise<CursoDocument>;
  abstract listarPorAnio(
    anio: number,
    cursoIds: Types.ObjectId[] | null,
  ): Promise<CursoDocument[]>;
  abstract buscarPorId(
    id: Types.ObjectId | string,
  ): Promise<CursoDocument | null>;
  abstract buscarPorAnioYNivel(
    anio: number,
    nivel: Nivel,
  ): Promise<CursoDocument[]>;
  abstract listarNivelesConCursoEnAnio(anio: number): Promise<Nivel[]>;
}
