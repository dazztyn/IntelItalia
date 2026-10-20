import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import { Types } from 'mongoose';
import type { Alcance, Permiso } from '../usuarios/permisos';

export const CLAVE_PERMISOS = 'permisosRequeridos';
export const CLAVE_PUBLICA = 'rutaPublica';
export const CLAVE_SOLO_AUTENTICADO = 'rutaSoloAutenticado';

export interface ExtractorSesionHttp {
  extraerUsuarioIdDePeticion(peticion: Request): Promise<string | null>;
}

export interface UsuarioAutorizado {
  id: Types.ObjectId;
  correo: string;
  nombre: string;
  rol: string;
  alcance: Alcance;
  permisos: Permiso[];
  cursoIds: Types.ObjectId[];
}

export interface SolicitudAutorizada extends Request {
  sesion?: { usuarioId: string };
  usuario?: UsuarioAutorizado;
}

export const RequierePermisos = (...permisos: Permiso[]) =>
  SetMetadata(CLAVE_PERMISOS, permisos);

export const Publica = () => SetMetadata(CLAVE_PUBLICA, true);

export const SoloAutenticado = () => SetMetadata(CLAVE_SOLO_AUTENTICADO, true);

export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<SolicitudAutorizada>().usuario,
);