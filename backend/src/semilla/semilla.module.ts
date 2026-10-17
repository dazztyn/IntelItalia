import { Module } from '@nestjs/common';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { AsignaturasModule } from '../asignaturas/asignaturas.module';
import { CursosModule } from '../cursos/cursos.module';
import { NucleoModule } from '../nucleo.module';
import { SemillaService } from './semilla.service';

// Solo MongoDB y las entidades: no levanta la API ni se conecta a Redis.
@Module({
  imports: [NucleoModule, CursosModule, AsignaturasModule, AlumnosModule],
  providers: [SemillaService],
})
export class SemillaModule {}
