import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { Curso, CursoSchema } from './curso.schema';
import { CursosController } from './cursos.controller';
import { CursosService } from './cursos.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Curso.name, schema: CursoSchema }]),
    AlumnosModule,
  ],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
