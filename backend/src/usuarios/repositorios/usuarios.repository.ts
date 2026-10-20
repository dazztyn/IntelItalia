import {
  DatosActualizarUsuario,
  DatosCrearUsuario,
} from '../interfaces/datos-usuario.interface';
import { UsuarioDocument } from '../schemas/usuario.schema';

export abstract class UsuariosRepository {
  abstract crear(datos: DatosCrearUsuario): Promise<UsuarioDocument>;
  abstract asegurarDirectoraInicial(correo: string): Promise<void>;
  abstract buscarActivoPorId(id: string): Promise<UsuarioDocument | null>;
  abstract buscarPorId(id: string): Promise<UsuarioDocument | null>;
  abstract buscarPorCorreo(correo: string): Promise<UsuarioDocument | null>;
  abstract listarTodos(): Promise<UsuarioDocument[]>;
  abstract actualizar(
    id: string,
    datos: DatosActualizarUsuario,
  ): Promise<UsuarioDocument | null>;
  abstract registrarUltimoAcceso(id: string, fecha: Date): Promise<void>;
}