import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asignatura, AsignaturaSchema } from './asignatura.schema';
import { AsignaturasService } from './asignaturas.service';
import { AsignaturasRepository } from './repositorios/asignaturas.repository';
import { MongooseAsignaturasRepository } from './repositorios/mongoose-asignaturas.repository';

// Sin controlador todavía: los endpoints llegan con el login y los permisos (PGT-6, PGT-7).
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asignatura.name, schema: AsignaturaSchema },
    ]),
  ],
  providers: [
    AsignaturasService,
    { provide: AsignaturasRepository, useClass: MongooseAsignaturasRepository },
  ],
  exports: [AsignaturasService],
})
export class AsignaturasModule {}
