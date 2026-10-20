import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request, Response } from 'express';
import { VariablesEntorno } from '../../configuracion/validacion';
import { PayloadJwt } from '../interfaces/payload-jwt.interface';

export const NOMBRE_COOKIE_SESION = 'intelitalia_sesion';

@Injectable()
export class SesionCookieService {
  private readonly esProduccion: boolean;
  private readonly duracionSegundos: number;

  constructor(
    private readonly jwtService: JwtService,
    configuracion: ConfigService<VariablesEntorno, true>,
  ) {
    this.esProduccion =
      configuracion.get('NODE_ENV', { infer: true }) === 'production';
    this.duracionSegundos = configuracion.get('JWT_DURACION_SEGUNDOS', {
      infer: true,
    });
  }

  async emitirSesionEnCookie(
    respuesta: Response,
    payload: PayloadJwt,
  ): Promise<void> {
    const token = await this.jwtService.signAsync(payload);
    respuesta.cookie(
      NOMBRE_COOKIE_SESION,
      token,
      this.obtenerOpcionesCookie(),
    );
  }

  limpiarCookieSesion(respuesta: Response): void {
    respuesta.clearCookie(NOMBRE_COOKIE_SESION, {
      ...this.obtenerOpcionesCookie(),
      maxAge: undefined,
    });
  }

  async extraerYVerificarToken(peticion: Request): Promise<PayloadJwt> {
    const cookies = peticion.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[NOMBRE_COOKIE_SESION];

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new UnauthorizedException('No se encontró una sesión activa');
    }

    try {
      return await this.jwtService.verifyAsync<PayloadJwt>(token);
    } catch {
      throw new UnauthorizedException('La sesión es inválida o ha expirado');
    }
  }

  private obtenerOpcionesCookie(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.esProduccion,
      sameSite: 'lax',
      path: '/',
      maxAge: this.duracionSegundos * 1000,
    };
  }
}