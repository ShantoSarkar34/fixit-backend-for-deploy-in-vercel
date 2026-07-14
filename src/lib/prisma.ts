import { PrismaClient } from '../../prisma/generated/index';
import { PrismaPg } from '@prisma/adapter-pg';
import config from '../config/index';

// Prevents multiple PrismaClient instances during dev hot-reloads
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ connectionString: config.database_url });

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: config.env === 'development' ? ['error', 'warn'] : ['error'],
  });

if (config.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
