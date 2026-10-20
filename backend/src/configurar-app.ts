import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { VariablesEntorno } from './configuracion/validacion';

export function configurarApp(app: INestApplication): void {
  const configuracion =
    app.get<ConfigService<VariablesEntorno, true>>(ConfigService);

  const adaptadorHttp = app.getHttpAdapter().getInstance() as {
    set?: (clave: string, valor: unknown) => void;
  };
  adaptadorHttp.set?.('trust proxy', 1);
  
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: configuracion.get('ORIGEN_FRONTEND', { infer: true }),
    // Necesario para la cookie httpOnly de la sesión (PGT-6).
    credentials: true,
  });
  app.enableShutdownHooks();
}
