import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "(not set)";
const masked = url.replace(/:([^:@]+)@/, ":***@");
console.log("DATABASE_URL:", masked);

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("Connection OK:", rows);
} catch (e) {
  console.error("Connection FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
