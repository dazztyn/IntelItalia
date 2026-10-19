import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permiso } from '../permisos';
import {
  CLAVE_PERMISOS,
  CLAVE_PUBLICA,
  SolicitudAutorizada,
} from '../requiere-permisos.decorator';
import { UsuariosService } from '../usuarios.service';

// Guard global (docs/ARQUITECTURA.md, sección 7.3): revisa *qué* acción se puede
// hacer. *Sobre qué datos* lo filtran los servicios con el alcance (alcance.ts).
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuariosService: UsuariosService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const objetivos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICA, objetivos)) {
      return true;
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutorizada>();
    const usuario = solicitud.sesion
      ? await this.usuariosService.obtenerUsuarioAutorizado(
          solicitud.sesion.usuarioId,
        )
      : null;
    if (!usuario) throw new UnauthorizedException();

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

    solicitud.usuario = usuario;
    return true;
  }
}
