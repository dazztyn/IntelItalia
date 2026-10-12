import { Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { opcionesRedisDesdeUrl } from '../configuracion/redis';
import { VariablesEntorno } from '../configuracion/validacion';
import { SaludController } from './salud.controller';
import { CLIENTE_REDIS_SALUD, SaludService } from './salud.service';

@Module({
  controllers: [SaludController],
  providers: [
    SaludService,
    {
      provide: CLIENTE_REDIS_SALUD,
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) => {
        const logger = new Logger('SaludRedis');
        const cliente = new Redis({
          ...opcionesRedisDesdeUrl(configuracion.get('REDIS_URL')),
          // Si Redis no responde, el ping falla de inmediato en vez de quedar en cola.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });
        let avisado = false;
        cliente.on('error', () => {
          if (!avisado) {
            logger.warn('No se pudo conectar a Redis; se reintentará.');
            avisado = true;
          }
        });
        cliente.on('ready', () => {
          avisado = false;
        });
        return cliente;
      },
    },
  ],
})
export class SaludModule implements OnModuleDestroy {
  constructor(
    @Inject(CLIENTE_REDIS_SALUD) private readonly redis: Pick<Redis, 'quit'>,
  ) {}

  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }
}
