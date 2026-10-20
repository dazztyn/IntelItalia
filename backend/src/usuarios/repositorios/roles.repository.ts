import { Permiso, RolInicial } from '../permisos';
import { RolDocument } from '../schemas/rol.schema';

export abstract class RolesRepository {
  abstract asegurarRolesIniciales(
    roles: readonly RolInicial[],
  ): Promise<number>;
  abstract buscarPorCodigo(codigo: string): Promise<RolDocument | null>;
  abstract listarTodos(): Promise<RolDocument[]>;
  abstract actualizarPermisos(
    codigo: string,
    permisos: Permiso[],
  ): Promise<RolDocument | null>;
}