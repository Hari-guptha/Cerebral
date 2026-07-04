import type { Project } from "@svg-animator/types";
import { isDatabaseConfigured, getPrisma } from "@/lib/server/prisma";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  versionCount: number;
}

export interface ProjectVersionSummary {
  id: string;
  label: string;
  createdAt: string;
}

export async function listProjectsDb(): Promise<ProjectSummary[]> {
  if (!isDatabaseConfigured()) return [];

  const prisma = getPrisma();
  const rows = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { versions: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    versionCount: r._count.versions,
  }));
}

export async function getProjectDb(id: string): Promise<Project | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  const row = await prisma.project.findUnique({ where: { id } });
  if (!row) return null;
  return row.data as unknown as Project;
}

export async function upsertProjectDb(project: Project): Promise<ProjectSummary> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const prisma = getPrisma();
  const row = await prisma.project.upsert({
    where: { id: project.id },
    create: {
      id: project.id,
      name: project.name,
      data: project as object,
    },
    update: {
      name: project.name,
      data: project as object,
    },
    include: { _count: { select: { versions: true } } },
  });

  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    versionCount: row._count.versions,
  };
}

export async function deleteProjectDb(id: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const prisma = getPrisma();
  await prisma.project.delete({ where: { id } });
}

export async function listVersionsDb(projectId: string): Promise<ProjectVersionSummary[]> {
  if (!isDatabaseConfigured()) return [];

  const prisma = getPrisma();
  const rows = await prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  });

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createVersionDb(
  projectId: string,
  project: Project,
  label: string
): Promise<ProjectVersionSummary> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await upsertProjectDb(project);

  const prisma = getPrisma();
  const row = await prisma.projectVersion.create({
    data: {
      projectId,
      label,
      data: project as object,
    },
  });

  return {
    id: row.id,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getVersionDb(versionId: string): Promise<Project | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  const row = await prisma.projectVersion.findUnique({ where: { id: versionId } });
  if (!row) return null;
  return row.data as unknown as Project;
}

export async function pruneAutoVersions(projectId: string, keep = 30): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const prisma = getPrisma();
  const autoVersions = await prisma.projectVersion.findMany({
    where: { projectId, label: { startsWith: "Auto ·" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const toDelete = autoVersions.slice(keep);
  if (toDelete.length === 0) return;

  await prisma.projectVersion.deleteMany({
    where: { id: { in: toDelete.map((v) => v.id) } },
  });
}
