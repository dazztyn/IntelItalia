import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VariablesEntorno } from './configuracion/validacion';

// Configuración común de la app, compartida por main.ts y los tests e2e.
export function configurarApp(app: INestApplication): void {
  const configuracion =
    app.get<ConfigService<VariablesEntorno, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: configuracion.get('ORIGEN_FRONTEND', { infer: true }),
    // Necesario para la cookie httpOnly de la sesión (PGT-6).
    credentials: true,
  });
  app.enableShutdownHooks();
}
