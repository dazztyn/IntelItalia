import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function limpiarEntornoE2e(): Promise<void> {
  await (globalThis as { mongoE2e?: MongoMemoryServer }).mongoE2e?.stop();
}
