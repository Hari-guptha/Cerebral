"use client";

import type { Project } from "@svg-animator/types";
import { saveProject } from "@/lib/db";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  createdAt?: string;
  versionCount?: number;
  source?: "server" | "local";
}

export interface ProjectVersionSummary {
  id: string;
  label: string;
  createdAt: string;
}

export function optimizeSvgString(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

export async function checkDatabaseStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) {
      setDatabaseCache(false);
      return false;
    }
    const data = await res.json();
    const online = Boolean(data.database);
    setDatabaseCache(online);
    return online;
  } catch {
    setDatabaseCache(false);
    return false;
  }
}

let databaseCache: { online: boolean; at: number } | null = null;
const DATABASE_CACHE_MS = 45_000;

function setDatabaseCache(online: boolean) {
  databaseCache = { online, at: Date.now() };
}

export function markDatabaseOffline() {
  setDatabaseCache(false);
}

/** Cached database probe — avoids hammering /api/projects while editing offline. */
export async function isDatabaseOnline(force = false): Promise<boolean> {
  if (!force && databaseCache && Date.now() - databaseCache.at < DATABASE_CACHE_MS) {
    return databaseCache.online;
  }
  return checkDatabaseStatus();
}

export async function listServerProjects(): Promise<ProjectSummary[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.projects ?? []).map((p: ProjectSummary) => ({ ...p, source: "server" as const }));
}

export async function saveProjectToServer(project: Project): Promise<boolean> {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (!res.ok) {
      if (res.status === 503) markDatabaseOffline();
      return false;
    }
    setDatabaseCache(true);
    return true;
  } catch {
    markDatabaseOffline();
    return false;
  }
}

export async function loadProjectFromServer(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.project as Project;
  } catch {
    return null;
  }
}

export async function deleteProjectFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listProjectVersions(projectId: string): Promise<ProjectVersionSummary[]> {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions ?? [];
  } catch {
    return [];
  }
}

export async function saveProjectVersion(
  project: Project,
  label?: string
): Promise<ProjectVersionSummary | null> {
  try {
    await saveProjectToServer(project);
    const res = await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, label }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function loadProjectVersion(
  projectId: string,
  versionId: string
): Promise<Project | null> {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.project as Project;
  } catch {
    return null;
  }
}

/** Persist to IndexedDB + PostgreSQL when available */
export async function persistProject(project: Project): Promise<{ local: boolean; server: boolean }> {
  let local = false;
  let server = false;

  try {
    await saveProject(project);
    local = true;
  } catch {
    local = false;
  }

  if (await isDatabaseOnline()) {
    server = await saveProjectToServer(project);
  }

  return { local, server };
}

export async function saveAutoVersion(project: Project): Promise<void> {
  const label = `Auto · ${new Date().toLocaleTimeString()}`;
  await saveProjectVersion(project, label);
}
