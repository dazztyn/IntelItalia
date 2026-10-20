import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  SERVICIO_AUDITORIA_ACCESO,
  type ServicioAuditoriaAcceso,
} from '../interfaces/auditoria-acceso.interface';
import {
  PROVEEDOR_USUARIO_SESION,
  type ProveedorUsuarioSesion,
  type UsuarioSesion,
} from '../interfaces/usuario-sesion.interface';
import { VerificadorGoogleService } from './verificador-google.service';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly verificadorGoogle: VerificadorGoogleService,
    @Inject(PROVEEDOR_USUARIO_SESION)
    private readonly proveedorUsuario: ProveedorUsuarioSesion,
    @Inject(SERVICIO_AUDITORIA_ACCESO)
    private readonly auditoriaAcceso: ServicioAuditoriaAcceso,
  ) {}

  async autenticarConGoogle(
    idToken: string,
    ip: string,
  ): Promise<UsuarioSesion> {
    const identidad = await this.verificadorGoogle.verificarIdToken(idToken);
    const ahora = new Date();

    const usuario = await this.proveedorUsuario.obtenerUsuarioPorCorreo(
      identidad.correo,
    );

    if (!usuario || !usuario.activo) {
      await this.auditoriaAcceso.registrarEventoAcceso({
        usuarioId: usuario?.id ?? null,
        accion: 'accesoDenegado',
        ip,
        fecha: ahora,
      });

      throw new ForbiddenException(
        'Su correo no está autorizado en la lista blanca o se encuentra inactivo',
      );
    }

    await Promise.all([
      this.proveedorUsuario.registrarUltimoAcceso(usuario.id, ahora),
      this.auditoriaAcceso.registrarEventoAcceso({
        usuarioId: usuario.id,
        accion: 'inicioSesion',
        ip,
        fecha: ahora,
      }),
    ]);

    return usuario;
  }

  async registrarCierreSesion(usuarioId: string, ip: string): Promise<void> {
    await this.auditoriaAcceso.registrarEventoAcceso({
      usuarioId,
      accion: 'cierreSesion',
      ip,
      fecha: new Date(),
    });
  }
}