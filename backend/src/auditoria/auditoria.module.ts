import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuditoriaRepository,
} from './auditoria.repository';
import {
  RegistroAuditoria,
  RegistroAuditoriaSchema,
} from './schemas/registro-auditoria.schema';
import { AuditoriaListener } from './auditoria.listener';
import { MongooseAuditoriaRepository } from './repositorios/mongoose-auditoria.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistroAuditoria.name, schema: RegistroAuditoriaSchema },
    ]),
  ],
  providers: [
    AuditoriaListener,
    {
      provide: AuditoriaRepository,
      useClass: MongooseAuditoriaRepository,
    },
    
  ],
  exports: [AuditoriaRepository],
})
export class AuditoriaModule {}