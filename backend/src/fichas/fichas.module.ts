import { Module } from '@nestjs/common';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { CursosModule } from '../cursos/cursos.module';
import { EvaluacionesModule } from '../evaluaciones/evaluaciones.module';
import { FichasController } from './fichas.controller';
import { FichasService } from './fichas.service';

// Módulo aparte porque junta alumnos, cursos y evaluaciones: dentro de AlumnosModule
// habría una dependencia circular con CursosModule.
@Module({
  imports: [AlumnosModule, CursosModule, EvaluacionesModule],
  controllers: [FichasController],
  providers: [FichasService],
})
export class FichasModule {}
