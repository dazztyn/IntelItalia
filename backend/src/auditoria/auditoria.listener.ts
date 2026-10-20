import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditoriaRepository } from './auditoria.repository';
import type { NuevoRegistroAuditoria } from './interfaces/nuevo-registro-auditoria.interface';

@Injectable()
export class AuditoriaListener {
  private readonly logger = new Logger('Auditoria');

  constructor(private readonly auditoriaRepo: AuditoriaRepository) {}

  @OnEvent('auditoria.acceso', { async: true })
  async manejarEventoAcceso(datos: NuevoRegistroAuditoria): Promise<void> {
    try {
      await this.auditoriaRepo.registrar(datos);
    } catch (error) {
      this.logger.error(`Error al registrar auditoría: ${error}`);
    }
  }
}