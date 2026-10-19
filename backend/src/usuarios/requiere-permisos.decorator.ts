import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Permiso } from './permisos';
import type { UsuarioAutorizado } from './usuarios.service';

export const CLAVE_PERMISOS = 'permisosRequeridos';
export const CLAVE_PUBLICA = 'rutaPublica';

/** Solicitud HTTP con la sesión (la llena el login, PGT-6) y el usuario autorizado. */
export interface SolicitudAutorizada extends Request {
  sesion?: { usuarioId: string };
  usuario?: UsuarioAutorizado;
}

/** El endpoint exige todos los permisos indicados. */
export const RequierePermisos = (...permisos: Permiso[]) =>
  SetMetadata(CLAVE_PERMISOS, permisos);

/** Ruta sin sesión (salud, login). Todas las demás exigen permisos. */
export const Publica = () => SetMetadata(CLAVE_PUBLICA, true);

/** Usuario autorizado de la solicitud, para filtrar por alcance en los servicios. */
export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<SolicitudAutorizada>().usuario,
);
