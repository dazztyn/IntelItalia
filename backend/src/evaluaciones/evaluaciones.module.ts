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

// Sin controlador: los resultados se ven en la ficha del alumno y se cargan en `cargas`.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TipoEvaluacion.name, schema: TipoEvaluacionSchema },
      { name: ResultadoEvaluacion.name, schema: ResultadoEvaluacionSchema },
    ]),
  ],
  providers: [EvaluacionesService],
  exports: [EvaluacionesService],
})
export class EvaluacionesModule {}
