export const PROVEEDOR_USUARIO_SESION = 'PROVEEDOR_USUARIO_SESION';

export interface UsuarioSesion 
{
  id: string;
  correo: string;
  nombre: string;
  rol: string;
  activo: boolean;
  alcance: 'escuela' | 'cursosAsignados';
  permisos: string[];
  cursoIds: string[];
}

export interface ProveedorUsuarioSesion 
{
  obtenerUsuarioPorId(id: string): Promise<UsuarioSesion | null>;
  obtenerUsuarioPorCorreo(correo: string): Promise<UsuarioSesion | null>;
  registrarUltimoAcceso(id: string, fecha: Date): Promise<void>;
}