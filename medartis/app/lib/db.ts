// app/lib/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  // 1. Create a native PostgreSQL connection pool using your Neon string
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // 2. Wrap it inside the Prisma 7 driver adapter
  const adapter = new PrismaPg(pool);

  // 3. Pass the adapter straight into the constructor
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;