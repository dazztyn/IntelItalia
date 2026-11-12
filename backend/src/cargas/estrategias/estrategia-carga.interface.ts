import { Types } from 'mongoose';
import { CursoDocument } from '../../cursos/curso.schema';
import { ArchivoSubido } from '../interfaces/archivo-subido.interface';
import { CargaDto } from '../dto/carga.dto';

export interface FilaExtraida<T = unknown> {
  fila: number;
  numeroLista: number | null;
  nombre: string;
  error?: string;
  sinResultado?: boolean;
  datos: T;
}

export interface DatosParseados<T = unknown, M = unknown> {
  anio: number;
  nivel: string;
  letra: string | null;
  area: string;
  ejes: string[];
  filas: FilaExtraida<T>[];
  meta: M;
}

export interface EstrategiaCarga<T = unknown, M = unknown> {
  readonly fuente: string;
  
  parsear(archivo: ArchivoSubido, dto: CargaDto): Promise<DatosParseados<T, M>>;
  
  guardar(
    filasAprobadas: Array<{ filaOriginal: FilaExtraida<T>; alumnoId: string }>,
    curso: CursoDocument,
    anio: number,
    cargaId: Types.ObjectId,
    meta: M,
  ): Promise<void>;
}