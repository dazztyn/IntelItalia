import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configurarApp } from './../src/configurar-app';
import { CLIENTE_REDIS_SALUD } from './../src/salud/salud.service';

// MongoDB corre en memoria (ver test/entorno-global.ts) y Redis se reemplaza por un doble.
describe('GET /api/salud (e2e)', () => {
  let app: INestApplication<App>;
  const redisFalso = {
    ping: jest.fn<Promise<string>, []>(),
    quit: jest.fn().mockResolvedValue('OK'),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLIENTE_REDIS_SALUD)
      .useValue(redisFalso)
      .compile();

    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 cuando MongoDB y Redis están arriba', async () => {
    redisFalso.ping.mockResolvedValueOnce('PONG');

    await request(app.getHttpServer())
      .get('/api/salud')
      .expect(200)
      .expect({ estado: 'ok', mongo: 'arriba', redis: 'arriba' });
  });

  it('responde 503 cuando Redis no responde', async () => {
    redisFalso.ping.mockRejectedValueOnce(new Error('sin conexión'));

    await request(app.getHttpServer())
      .get('/api/salud')
      .expect(503)
      .expect({ estado: 'degradado', mongo: 'arriba', redis: 'abajo' });
  });
});
