import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EvaluacionesService } from './evaluaciones.service';
import {
  ResultadoEvaluacion,
  ResultadoEvaluacionSchema,
} from './schemas/resultado-evaluacion.schema';
import {
  TipoEvaluacion,
  TipoEvaluacionSchema,
} from './schemas/tipo-evaluacion.schema';
import { EvaluacionesRepository } from './repositorios/evaluaciones.repository';
import { MongooseEvaluacionesRepository } from './repositorios/mongoose-evaluaciones.repository';

// Sin controlador: los resultados se ven en la ficha del alumno y se cargan en `cargas`.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TipoEvaluacion.name, schema: TipoEvaluacionSchema },
      { name: ResultadoEvaluacion.name, schema: ResultadoEvaluacionSchema },
    ]),
  ],
  providers: [
    EvaluacionesService,
    {
      provide: EvaluacionesRepository,
      useClass: MongooseEvaluacionesRepository,
    },
  ],
  exports: [EvaluacionesService],
})
export class EvaluacionesModule {}
