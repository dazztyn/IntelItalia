import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { VariablesEntorno } from '../../configuracion/validacion';
import { IdentidadGoogle } from '../interfaces/identidad-google.interface';

export const CLIENTE_OAUTH_GOOGLE = 'CLIENTE_OAUTH_GOOGLE';

export type ClienteVerificadorGoogle = Pick<OAuth2Client, 'verifyIdToken'>;

@Injectable()
export class VerificadorGoogleService {
  private readonly clientId: string;
  private readonly dominioPermitido?: string;

  constructor(
    @Inject(CLIENTE_OAUTH_GOOGLE)
    private readonly clienteGoogle: ClienteVerificadorGoogle,
    configuracion: ConfigService<VariablesEntorno, true>,
  ) {
    this.clientId = configuracion.get('GOOGLE_CLIENT_ID', { infer: true });
    const dominio = configuracion.get('DOMINIO_GOOGLE_PERMITIDO', {
      infer: true,
    });
    this.dominioPermitido = dominio ? dominio.toLowerCase() : undefined;
  }

  async verificarIdToken(idToken: string): Promise<IdentidadGoogle> {
    const payload = await this.obtenerPayloadVerificado(idToken);

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene un correo verificado',
      );
    }

    const correoNormalizado = payload.email.trim().toLowerCase();
    const dominioToken = payload.hd?.trim().toLowerCase();

    this.validarDominioInstitucional(correoNormalizado, dominioToken);

    return {
      googleId: payload.sub,
      correo: correoNormalizado,
      nombre: payload.name?.trim() || correoNormalizado,
      dominio: dominioToken,
    };
  }

  private async obtenerPayloadVerificado(
    idToken: string,
  ): Promise<TokenPayload> {
    try {
      const ticket = await this.clienteGoogle.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('El token de Google no contiene datos');
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        'El token de Google es inválido o ha expirado',
      );
    }
  }

  private validarDominioInstitucional(
    correo: string,
    dominioClaim?: string,
  ): void {
    if (!this.dominioPermitido) {
      return;
    }

    const cumpleClaimHd = dominioClaim === this.dominioPermitido;
    const cumpleSufijoCorreo = correo.endsWith(`@${this.dominioPermitido}`);

    if (!cumpleClaimHd || !cumpleSufijoCorreo) {
      throw new ForbiddenException(
        'Solo se permiten cuentas del dominio institucional autorizado',
      );
    }
  }
}