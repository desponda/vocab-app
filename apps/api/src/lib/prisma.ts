import { PrismaClient } from '@prisma/client';
import { config } from './config';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (config.nodeEnv !== 'production') {
  globalThis.prismaGlobal = prisma;
}
