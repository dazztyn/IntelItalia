import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  esquemaVariablesEntorno,
  VariablesEntorno,
} from './configuracion/validacion';

// Configuración validada y conexión a MongoDB. Lo usan la API (AppModule) y los
// scripts que corren fuera de ella, como la carga de datos ficticios.
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
        uri: configuracion.get('MONGO_URI', { infer: true }),
      }),
    }),
  ],
})
export class NucleoModule {}
