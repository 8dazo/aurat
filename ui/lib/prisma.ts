import { PrismaClient } from '../generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma