import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  CLAVE_PERMISOS,
  CLAVE_PUBLICA,
  CLAVE_SOLO_AUTENTICADO,
  SolicitudAutorizada,
} from '../../comun/autorizacion';
import type { Permiso } from '../permisos';
import { UsuariosService } from '../usuarios.service';

export const EXTRACTOR_SESION_HTTP = 'EXTRACTOR_SESION_HTTP';

export interface ExtractorSesionHttp {
  extraerUsuarioIdDePeticion(peticion: Request): Promise<string | null>;
}

// Guard global (docs/ARQUITECTURA.md, sección 7.3): revisa *qué* acción se puede
// hacer. *Sobre qué datos* lo filtran los servicios con el alcance (alcance.ts).
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuariosService: UsuariosService,
    @Optional()
    @Inject(EXTRACTOR_SESION_HTTP)
    private readonly extractorSesion?: ExtractorSesionHttp,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const objetivos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICA, objetivos)) {
      return true;
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutorizada>();

    if (!solicitud.sesion && this.extractorSesion) {
      const usuarioId =
        await this.extractorSesion.extraerUsuarioIdDePeticion(solicitud);
      if (usuarioId) {
        solicitud.sesion = { usuarioId };
      }
    }

    const usuario = solicitud.sesion
      ? await this.usuariosService.obtenerUsuarioAutorizado(
          solicitud.sesion.usuarioId,
        )
      : null;
    if (!usuario) throw new UnauthorizedException();

    solicitud.usuario = usuario;

    if (
      this.reflector.getAllAndOverride<boolean>(
        CLAVE_SOLO_AUTENTICADO,
        objetivos,
      )
    ) {
      return true;
    }

    const requeridos = this.reflector.getAllAndOverride<Permiso[] | undefined>(
      CLAVE_PERMISOS,
      objetivos,
    );
    // Sin @RequierePermisos se deniega: olvidar el decorador no puede exponer datos.
    if (
      !requeridos?.length ||
      !requeridos.every((permiso) => usuario.permisos.includes(permiso))
    ) {
      throw new ForbiddenException();
    }

    return true;
  }
}