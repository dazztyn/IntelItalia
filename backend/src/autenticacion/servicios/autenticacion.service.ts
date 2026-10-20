import { ForbiddenException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UsuarioAutorizado } from '../../comun/autorizacion';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { VerificadorGoogleService } from './verificador-google.service';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly verificadorGoogle: VerificadorGoogleService,
    private readonly usuariosService: UsuariosService,
    private readonly emisorEventos: EventEmitter2,
  ) {}

  async autenticarConGoogle(
    idToken: string,
    ip: string,
  ): Promise<UsuarioAutorizado> {
    const identidad = await this.verificadorGoogle.verificarIdToken(idToken);
    const ahora = new Date();

    const usuarioAutorizado =
      await this.usuariosService.obtenerUsuarioAutorizadoPorCorreo(
        identidad.correo,
      );

    if (!usuarioAutorizado) {
      this.emisorEventos.emit('auditoria.acceso', {
        usuarioId: null, 
        accion: 'accesoDenegado',
        recurso: 'sesion',
        ip,
        fecha: ahora,
      });

      throw new ForbiddenException(
        'Su correo no está autorizado en la lista blanca o se encuentra inactivo',
      );
    }

    const idTexto = String(usuarioAutorizado.id);

    await this.usuariosService.registrarUltimoAcceso(idTexto, ahora);

    this.emisorEventos.emit('auditoria.acceso', {
      usuarioId: usuarioAutorizado.id,
      accion: 'inicioSesion',
      recurso: 'sesion',
      ip,
      fecha: ahora,
    });

    return usuarioAutorizado;
  }

  async registrarCierreSesion(usuarioId: string, ip: string): Promise<void> {
    this.emisorEventos.emit('auditoria.acceso', {
      usuarioId,
      accion: 'cierreSesion',
      recurso: 'sesion',
      ip,
      fecha: new Date(),
    });
  }
}