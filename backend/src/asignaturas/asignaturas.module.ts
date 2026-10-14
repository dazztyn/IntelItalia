import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asignatura, AsignaturaSchema } from './asignatura.schema';
import { AsignaturasService } from './asignaturas.service';

// Sin controlador todavía: los endpoints llegan con el login y los permisos (PGT-6, PGT-7).
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asignatura.name, schema: AsignaturaSchema },
    ]),
  ],
  providers: [AsignaturasService],
  exports: [AsignaturasService],
})
export class AsignaturasModule {}
