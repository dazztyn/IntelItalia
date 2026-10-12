import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { opcionesRedisDesdeUrl } from './configuracion/redis';
import {
  esquemaVariablesEntorno,
  VariablesEntorno,
} from './configuracion/validacion';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env en backend/ o en la raíz del repo (el mismo que usa docker compose).
      envFilePath: ['.env', '../.env'],
      validationSchema: esquemaVariablesEntorno,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) => ({
        uri: configuracion.get('MONGO_URI'),
      }),
    }),
    // Configuración compartida de las colas. Todavía no hay colas registradas,
    // así que BullMQ no abre conexiones hasta que un módulo agregue una.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) => ({
        connection: opcionesRedisDesdeUrl(configuracion.get('REDIS_URL')),
      }),
    }),
    SaludModule,
  ],
})
export class AppModule {}
