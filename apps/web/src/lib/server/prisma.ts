import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  databaseUrl: string | undefined;
};

/** Canonical Docker Postgres URL for local development. */
export const DOCKER_DATABASE_URL =
  "postgresql://svganimator:svganimator@127.0.0.1:5433/svganimator";

function normalizeDatabaseUrl(url: string): string {
  return url.replace("@localhost:", "@127.0.0.1:");
}

/**
 * Resolves the Postgres URL for Prisma.
 *
 * Prefer CEREBRAL_DATABASE_URL — Windows often has a system DATABASE_URL that
 * overrides apps/web/.env with wrong credentials or port 5432.
 */
export function resolveDatabaseUrl(): string | undefined {
  const cerebral = process.env.CEREBRAL_DATABASE_URL?.trim();
  if (cerebral) return normalizeDatabaseUrl(cerebral);

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  // Legacy: system DATABASE_URL aimed at local Postgres on 5432 — use Docker URL.
  if (
    raw.includes("svganimator") &&
    (raw.includes(":5432/") || raw.includes(":5432?"))
  ) {
    return DOCKER_DATABASE_URL;
  }

  return normalizeDatabaseUrl(raw);
}

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.PRISMA_LOG === "1" ? ["error", "warn"] : [],
  });
}

export function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.databaseUrl = undefined;
}

export function getPrisma(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (globalForPrisma.prisma && globalForPrisma.databaseUrl === url) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    resetPrismaClient();
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.databaseUrl = url;
  }
  return client;
}

/** @deprecated use getPrisma() — kept for existing imports */
export const prisma = getPrisma();

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function getDatabaseUrlForDebug(): string {
  const url = resolveDatabaseUrl();
  if (!url) return "(not set)";
  const source = process.env.CEREBRAL_DATABASE_URL?.trim()
    ? "CEREBRAL_DATABASE_URL"
    : "DATABASE_URL";
  return `${source} → ${url.replace(/:([^:@]+)@/, ":***@")}`;
}
