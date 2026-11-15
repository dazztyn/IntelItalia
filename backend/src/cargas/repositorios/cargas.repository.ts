import { Types } from 'mongoose';
import { CargaDocument } from '../schemas/carga.schema';
import { DatosCrearCarga } from '../interfaces/datos-crear-carga.interface';

export abstract class CargasRepository {
  abstract crear(datos: DatosCrearCarga): Promise<CargaDocument>;
  /** Las más recientes de esas fuentes; `cursoIds = null` es toda la escuela. */
  abstract listarRecientes(
    fuentes: string[],
    cursoIds: Types.ObjectId[] | null,
    limite?: number,
  ): Promise<CargaDocument[]>;
  abstract buscarPorId(id: Types.ObjectId): Promise<CargaDocument | null>;
}
