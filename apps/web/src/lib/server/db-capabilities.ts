import { getPrisma } from "@/lib/server/prisma";

/** True when the generated Prisma client includes collaboration tables. */
export function hasPresenceModel(): boolean {
  const prisma = getPrisma();
  return "projectPresence" in prisma && prisma.projectPresence != null;
}

export function hasShareLinkModel(): boolean {
  const prisma = getPrisma();
  return "shareLink" in prisma && prisma.shareLink != null;
}

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: string };
  return (
    e.name === "PrismaClientInitializationError" ||
    e.code === "P1000" ||
    e.code === "P1001" ||
    e.code === "P1017"
  );
}
