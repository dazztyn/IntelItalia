import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlumnosModule } from './alumnos/alumnos.module';
import { AsignaturasModule } from './asignaturas/asignaturas.module';
import { opcionesRedisDesdeUrl } from './configuracion/redis';
import { VariablesEntorno } from './configuracion/validacion';
import { CursosModule } from './cursos/cursos.module';
import { NucleoModule } from './nucleo.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    NucleoModule,
    // Configuración compartida de las colas. Todavía no hay colas registradas,
    // así que BullMQ no abre conexiones hasta que un módulo agregue una.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) => ({
        connection: opcionesRedisDesdeUrl(
          configuracion.get('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    SaludModule,
    CursosModule,
    AsignaturasModule,
    AlumnosModule,
  ],
})
export class AppModule {}
