import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "bookshelf",
    password: process.env.DB_PASSWORD || "bookshelf123",
    database: process.env.DB_NAME || "bookshelf",
    port: parseInt(process.env.DB_PORT || "3306"),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
