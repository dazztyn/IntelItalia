import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VariablesEntorno } from './configuracion/validacion';
import { configurarApp } from './configurar-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);

  const configuracion =
    app.get<ConfigService<VariablesEntorno, true>>(ConfigService);
  await app.listen(configuracion.get('PUERTO', { infer: true }));
}
void bootstrap();
