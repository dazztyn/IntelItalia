import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditoriaRepository } from '../../auditoria/auditoria.repository';
import type { UsuarioAutorizado } from '../../comun/autorizacion';
import { UsuariosRepository } from '../../usuarios/repositorios/usuarios.repository';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { VerificadorGoogleService } from './verificador-google.service';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly verificadorGoogle: VerificadorGoogleService,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly usuariosService: UsuariosService,
    private readonly auditoriaRepo: AuditoriaRepository,
  ) {}

  async autenticarConGoogle(
    idToken: string,
    ip: string,
  ): Promise<UsuarioAutorizado> {
    const identidad = await this.verificadorGoogle.verificarIdToken(idToken);
    const ahora = new Date();

    const usuarioDoc = await this.usuariosRepo.buscarPorCorreo(
      identidad.correo,
    );
    const usuarioAutorizado = usuarioDoc
      ? await this.usuariosService.obtenerUsuarioAutorizado(
          String(usuarioDoc._id),
        )
      : null;

    if (!usuarioDoc || !usuarioAutorizado) {
      await this.auditoriaRepo.registrar({
        usuarioId: usuarioDoc?._id ?? null,
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

    await Promise.all([
      this.usuariosRepo.registrarUltimoAcceso(idTexto, ahora),
      this.auditoriaRepo.registrar({
        usuarioId: usuarioAutorizado.id,
        accion: 'inicioSesion',
        recurso: 'sesion',
        ip,
        fecha: ahora,
      }),
    ]);

    return usuarioAutorizado;
  }

  async registrarCierreSesion(usuarioId: string, ip: string): Promise<void> {
    await this.auditoriaRepo.registrar({
      usuarioId,
      accion: 'cierreSesion',
      recurso: 'sesion',
      ip,
      fecha: new Date(),
    });
  }
}