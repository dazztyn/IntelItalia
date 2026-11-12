import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { CursosModule } from '../cursos/cursos.module';
import { EvaluacionesModule } from '../evaluaciones/evaluaciones.module';
import { CargasController } from './cargas.controller';
import { CargasService } from './cargas.service';
import { Carga, CargaSchema } from './schemas/carga.schema';
import { CargasRepository } from './repositorios/cargas.repository';
import { MongooseCargasRepository } from './repositorios/mongoose-cargas.repository';
import { DiaEstrategia } from './estrategias/dia.estrategia';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Carga.name, schema: CargaSchema }]),
    CursosModule,
    AlumnosModule,
    EvaluacionesModule,
  ],
  controllers: [CargasController],
  providers: [
    CargasService,
    DiaEstrategia,
    { provide: CargasRepository, useClass: MongooseCargasRepository },
  ],
  exports: [CargasService],
})
export class CargasModule {}
