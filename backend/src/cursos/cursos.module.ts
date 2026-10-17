import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Curso, CursoSchema } from './curso.schema';
import { CursosService } from './cursos.service';

// Sin controlador todavía: los endpoints llegan con el login y los permisos (PGT-6, PGT-7).
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Curso.name, schema: CursoSchema }]),
  ],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
