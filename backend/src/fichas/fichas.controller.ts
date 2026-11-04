import { Controller, Get, Param, Req } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Request } from 'express';
import { Types } from 'mongoose';
import {
  RequierePermisos,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { FichasService } from './fichas.service';

@Controller('alumnos')
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  /** Ficha del alumno; cada acceso queda en `registroAuditoria`. */
  @Get(':id')
  @RequierePermisos('alumnos.ver')
  obtener(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UsuarioActual() usuario: UsuarioAutorizado,
    @Req() peticion: Request,
  ) {
    return this.fichasService.obtener(
      id,
      usuario,
      peticion.ip || 'desconocida',
    );
  }
}
