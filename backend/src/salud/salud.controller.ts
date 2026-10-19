import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Publica } from '../usuarios/requiere-permisos.decorator';
import { EstadoSalud, SaludService } from './salud.service';

// Endpoint público para los healthchecks de Docker y del proxy.
// No expone datos personales ni detalles internos de los servicios.
@Publica()
@Controller('salud')
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @Get()
  async revisar(
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<EstadoSalud> {
    const salud = await this.saludService.revisar();

    if (salud.estado !== 'ok') {
      respuesta.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return salud;
  }
}
