import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type Redis from 'ioredis';
import { Connection, ConnectionStates } from 'mongoose';

export const CLIENTE_REDIS_SALUD = 'CLIENTE_REDIS_SALUD';

const TIEMPO_MAXIMO_PING_MS = 1000;

export type EstadoServicio = 'arriba' | 'abajo';

export interface EstadoSalud {
  estado: 'ok' | 'degradado';
  mongo: EstadoServicio;
  redis: EstadoServicio;
}

@Injectable()
export class SaludService {
  constructor(
    @InjectConnection() private readonly conexionMongo: Connection,
    @Inject(CLIENTE_REDIS_SALUD) private readonly redis: Pick<Redis, 'ping'>,
  ) {}

  async revisar(): Promise<EstadoSalud> {
    const mongo: EstadoServicio =
      this.conexionMongo.readyState === ConnectionStates.connected
        ? 'arriba'
        : 'abajo';
    const redis = await this.revisarRedis();

    return {
      estado: mongo === 'arriba' && redis === 'arriba' ? 'ok' : 'degradado',
      mongo,
      redis,
    };
  }

  private async revisarRedis(): Promise<EstadoServicio> {
    let temporizador: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(
        () => rechazar(new Error('Tiempo de espera agotado')),
        TIEMPO_MAXIMO_PING_MS,
      );
    });

    try {
      const respuesta = await Promise.race([this.redis.ping(), limite]);
      return respuesta === 'PONG' ? 'arriba' : 'abajo';
    } catch {
      return 'abajo';
    } finally {
      clearTimeout(temporizador);
    }
  }
}
