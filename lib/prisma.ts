import { PrismaClient } from '@prisma/client';

declare global {
  var __bioLinkPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__bioLinkPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__bioLinkPrisma = prisma;
}