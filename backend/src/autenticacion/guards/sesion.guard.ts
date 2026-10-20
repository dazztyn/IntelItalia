import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CLAVE_RUTA_PUBLICA } from '../decoradores/ruta-publica.decorator';
import {
  PROVEEDOR_USUARIO_SESION,
  type ProveedorUsuarioSesion,
  type UsuarioSesion,
} from '../interfaces/usuario-sesion.interface';
import { SesionCookieService } from '../servicios/sesion-cookie.service';

@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sesionCookieService: SesionCookieService,
    @Inject(PROVEEDOR_USUARIO_SESION)
    private readonly proveedorUsuario: ProveedorUsuarioSesion,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(
      CLAVE_RUTA_PUBLICA,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (esPublica) {
      return true;
    }

    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioSesion }>();

    const payload =
      await this.sesionCookieService.extraerYVerificarToken(peticion);

    const usuario = await this.proveedorUsuario.obtenerUsuarioPorId(
      payload.sub,
    );

    if (!usuario) {
      throw new UnauthorizedException('El usuario de la sesión ya no existe');
    }

    if (!usuario.activo) {
      throw new ForbiddenException(
        'Su cuenta ha sido desactivada por la administración',
      );
    }

    peticion.usuario = usuario;
    return true;
  }
}