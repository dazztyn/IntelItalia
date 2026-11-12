import { Types } from 'mongoose';
import { Area, AsignaturaDocument } from '../asignatura.schema';
import { AsignaturaCatalogo } from '../interfaces/asignatura-catalogo.interface';

export abstract class AsignaturasRepository {
  abstract listar(): Promise<AsignaturaDocument[]>;
  abstract listarPorArea(area: Area): Promise<AsignaturaDocument[]>;
  abstract buscarPorCodigo(codigo: string): Promise<AsignaturaDocument | null>;
  abstract buscarPorNombre(
    nombreNormalizado: string,
    entreIds?: Types.ObjectId[],
  ): Promise<AsignaturaDocument[]>;
  abstract asegurarCatalogo(catalogo: AsignaturaCatalogo[]): Promise<number>;
}
