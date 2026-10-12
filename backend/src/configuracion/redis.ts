import type { RedisOptions } from 'ioredis';

// ioredis no recibe la URL dentro del objeto de opciones, así que REDIS_URL
// (redis://usuario:clave@host:puerto/db) se traduce a opciones sueltas.
export function opcionesRedisDesdeUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
