import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  Publica,
  SoloAutenticado,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { LoginGoogleDto } from './dto/login-google.dto';
import { AutenticacionService } from './servicios/autenticacion.service';
import { SesionCookieService } from './servicios/sesion-cookie.service';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(
    private readonly autenticacionService: AutenticacionService,
    private readonly sesionCookieService: SesionCookieService,
  ) {}

  @Publica()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async iniciarSesionConGoogle(
    @Body() dto: LoginGoogleDto,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<UsuarioAutorizado> {
    const ip = peticion.ip || 'desconocida';
    const usuario = await this.autenticacionService.autenticarConGoogle(
      dto.idToken,
      ip,
    );

    await this.sesionCookieService.emitirSesionEnCookie(respuesta, {
      sub: String(usuario.id),
      correo: usuario.correo,
    });

    return usuario;
  }

  @SoloAutenticado()
  @Get('perfil')
  obtenerPerfil(
    @UsuarioActual() usuario: UsuarioAutorizado,
  ): UsuarioAutorizado {
    return usuario;
  }

  @SoloAutenticado()
  @Post('salir')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cerrarSesion(
    @UsuarioActual() usuario: UsuarioAutorizado,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    const ip = peticion.ip || 'desconocida';
    this.sesionCookieService.limpiarCookieSesion(respuesta);
    await this.autenticacionService.registrarCierreSesion(
      String(usuario.id),
      ip,
    );
  }
}