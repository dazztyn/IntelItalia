import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuditoriaRepository,
  MongooseAuditoriaRepository,
} from './auditoria.repository';
import {
  RegistroAuditoria,
  RegistroAuditoriaSchema,
} from './schemas/registro-auditoria.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistroAuditoria.name, schema: RegistroAuditoriaSchema },
    ]),
  ],
  providers: [
    {
      provide: AuditoriaRepository,
      useClass: MongooseAuditoriaRepository,
    },
  ],
  exports: [AuditoriaRepository],
})
export class AuditoriaModule {}