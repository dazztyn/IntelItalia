import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EstadoSalud, SaludService } from './salud.service';
import { Publica } from '../comun/autorizacion';

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
