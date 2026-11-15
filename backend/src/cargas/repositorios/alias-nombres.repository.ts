import { Types } from 'mongoose';

export interface DatosAliasNombre {
  fuente: string;
  cursoId: Types.ObjectId;
  clave: string;
  alumnoId: Types.ObjectId;
  creadoPor: Types.ObjectId;
}

export abstract class AliasNombresRepository {
  /** Alias de la fuente y el curso, como mapa `clave → alumnoId`. */
  abstract listarPorFuenteYCurso(
    fuente: string,
    cursoId: Types.ObjectId,
  ): Promise<Map<string, string>>;
  /** Crea el alias o lo actualiza si esa clave ya apuntaba a otro alumno. */
  abstract guardar(datos: DatosAliasNombre): Promise<void>;
}
