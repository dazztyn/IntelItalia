import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlumnosModule } from './alumnos/alumnos.module';
import { AsignaturasModule } from './asignaturas/asignaturas.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { CargasModule } from './cargas/cargas.module';
import { opcionesRedisDesdeUrl } from './configuracion/redis';
import { VariablesEntorno } from './configuracion/validacion';
import { CursosModule } from './cursos/cursos.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { FichasModule } from './fichas/fichas.module';
import { NucleoModule } from './nucleo.module';
import { SaludModule } from './salud/salud.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    NucleoModule,
    EventEmitterModule.forRoot(),
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
    AuditoriaModule,
    UsuariosModule,
    AutenticacionModule,
    EvaluacionesModule,
    CargasModule,
    FichasModule,
  ],
})
export class AppModule {}
