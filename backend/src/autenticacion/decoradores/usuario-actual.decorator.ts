import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioSesion } from '../interfaces/usuario-sesion.interface';

export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioSesion => {
    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { usuario: UsuarioSesion }>();
    return peticion.usuario;
  },
);