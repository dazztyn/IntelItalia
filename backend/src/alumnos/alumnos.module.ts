import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alumno, AlumnoSchema } from './alumno.schema';
import { AlumnosService } from './alumnos.service';
import { AlumnosRepository } from './repositorios/alumnos.repository';
import { MongooseAlumnosRepository } from './repositorios/mongoose-alumnos.repository';

// Sin controlador propio todavía: el listado por curso está en CursosController
// (GET /api/cursos/:id/alumnos). La ficha llega con la auditoría de accesos.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alumno.name, schema: AlumnoSchema }]),
  ],
  providers: [
    AlumnosService,
    { provide: AlumnosRepository, useClass: MongooseAlumnosRepository },
  ],
  exports: [AlumnosService],
})
export class AlumnosModule {}
