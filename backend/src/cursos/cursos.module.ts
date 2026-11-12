import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { AsignaturasModule } from '../asignaturas/asignaturas.module';
import { Curso, CursoSchema } from './curso.schema';
import { CursosController } from './cursos.controller';
import { CursosService } from './cursos.service';
import { CursosRepository } from './repositorios/cursos.repository';
import { MongooseCursosRepository } from './repositorios/mongoose-cursos.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Curso.name, schema: CursoSchema }]),
    AlumnosModule,
    AsignaturasModule,
  ],
  controllers: [CursosController],
  providers: [
    CursosService,
    { provide: CursosRepository, useClass: MongooseCursosRepository },
  ],
  exports: [CursosService],
})
export class CursosModule {}
