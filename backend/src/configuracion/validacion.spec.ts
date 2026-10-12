import { opcionesRedisDesdeUrl } from './redis';
import { esquemaVariablesEntorno, VariablesEntorno } from './validacion';

describe('esquemaVariablesEntorno', () => {
  const variablesValidas = {
    MONGO_URI: 'mongodb://localhost:27017/intelitalia',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('acepta una configuración mínima y completa los valores por defecto', () => {
    const { error, value } = esquemaVariablesEntorno.validate(
      variablesValidas,
    ) as { error?: Error; value: VariablesEntorno };

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PUERTO: 3000,
      ORIGEN_FRONTEND: 'http://localhost:5173',
    });
  });

  it('rechaza la configuración si falta MONGO_URI', () => {
    const { error } = esquemaVariablesEntorno.validate({
      REDIS_URL: variablesValidas.REDIS_URL,
    });

    expect(error?.message).toContain('MONGO_URI');
  });

  it('rechaza una REDIS_URL que no es de Redis', () => {
    const { error } = esquemaVariablesEntorno.validate({
      ...variablesValidas,
      REDIS_URL: 'http://localhost:6379',
    });

    expect(error?.message).toContain('REDIS_URL');
  });

  it('rechaza un NODE_ENV desconocido', () => {
    const { error } = esquemaVariablesEntorno.validate({
      ...variablesValidas,
      NODE_ENV: 'staging',
    });

    expect(error?.message).toContain('NODE_ENV');
  });
});

describe('opcionesRedisDesdeUrl', () => {
  it('separa host, puerto, clave y base de datos', () => {
    expect(opcionesRedisDesdeUrl('redis://:cl%40ve@redis:6380/2')).toEqual({
      host: 'redis',
      port: 6380,
      username: undefined,
      password: 'cl@ve',
      db: 2,
      tls: undefined,
    });
  });

  it('usa el puerto y la base por defecto y activa TLS con rediss', () => {
    expect(opcionesRedisDesdeUrl('rediss://localhost')).toMatchObject({
      port: 6379,
      db: 0,
      tls: {},
    });
  });
});
