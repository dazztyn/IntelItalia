import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alumno, AlumnoSchema } from './alumno.schema';
import { AlumnosService } from './alumnos.service';

// Sin controlador todavía: exponer datos de alumnos antes del login y del guard de
// permisos (PGT-6, PGT-7) los dejaría abiertos. Los endpoints llegan con esas tareas.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alumno.name, schema: AlumnoSchema }]),
  ],
  providers: [AlumnosService],
  exports: [AlumnosService],
})
export class AlumnosModule {}
