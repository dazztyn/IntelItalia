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
import { RutaPublica } from './decoradores/ruta-publica.decorator';
import { UsuarioActual } from './decoradores/usuario-actual.decorator';
import { LoginGoogleDto } from './dto/login-google.dto';
import type { UsuarioSesion } from './interfaces/usuario-sesion.interface';
import { AutenticacionService } from './servicios/autenticacion.service';
import { SesionCookieService } from './servicios/sesion-cookie.service';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(
    private readonly autenticacionService: AutenticacionService,
    private readonly sesionCookieService: SesionCookieService,
  ) {}

  @RutaPublica()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async iniciarSesionConGoogle(
    @Body() dto: LoginGoogleDto,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<UsuarioSesion> {
    const ip = peticion.ip || 'desconocida';
    const usuario = await this.autenticacionService.autenticarConGoogle(
      dto.idToken,
      ip,
    );

    await this.sesionCookieService.emitirSesionEnCookie(respuesta, {
      sub: usuario.id,
      correo: usuario.correo,
    });

    return usuario;
  }

  @Get('perfil')
  obtenerPerfil(@UsuarioActual() usuario: UsuarioSesion): UsuarioSesion {
    return usuario;
  }

  @Post('salir')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cerrarSesion(
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    const ip = peticion.ip || 'desconocida';
    this.sesionCookieService.limpiarCookieSesion(respuesta);
    await this.autenticacionService.registrarCierreSesion(usuario.id, ip);
  }
}