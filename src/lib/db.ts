import { ensureDb } from './ensure-db';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Dynamic lookup so Next.js cannot inline Sensitive Vercel secrets away at build time. */
function env(name: string): string {
  return process.env[name] || '';
}

export function isTursoMode(): boolean {
  return Boolean((env('TURSO_DATABASE_URL') || env('LIBSQL_URL')) && env('TURSO_AUTH_TOKEN'));
}

function createPrismaClient() {
  const url = env('TURSO_DATABASE_URL') || env('LIBSQL_URL');
  const authToken = env('TURSO_AUTH_TOKEN');
  if (url && authToken) {
    const libsql = createClient({ url, authToken });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  ensureDb();
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
