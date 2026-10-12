import { MongoMemoryServer } from 'mongodb-memory-server';

// Se ejecuta una vez antes de los tests e2e. AppModule valida las variables
// de entorno al importarse, así que tienen que existir antes de cargarlo.
export default async function iniciarEntornoE2e(): Promise<void> {
  // Con MONGO_URI_E2E se usa un MongoDB existente (p. ej. el de docker compose);
  // si no, se levanta uno en memoria.
  if (process.env.MONGO_URI_E2E) {
    process.env.MONGO_URI = process.env.MONGO_URI_E2E;
  } else {
    const mongo = await MongoMemoryServer.create();
    (globalThis as { mongoE2e?: MongoMemoryServer }).mongoE2e = mongo;
    process.env.MONGO_URI = mongo.getUri('intelitalia-e2e');
  }

  // Redis se reemplaza por un doble en cada test; esta URL solo pasa la validación.
  process.env.REDIS_URL = 'redis://localhost:6379';
}
