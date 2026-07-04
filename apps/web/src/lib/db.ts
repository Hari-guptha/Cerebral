import Dexie, { type EntityTable } from "dexie";
import type { Project } from "@svg-animator/types";

export interface StoredProject {
  id: string;
  name: string;
  updatedAt: number;
  project: Project;
}

class SvgAnimatorDB extends Dexie {
  projects!: EntityTable<StoredProject, "id">;

  constructor() {
    super("svg-animator");
    this.version(1).stores({
      projects: "id, name, updatedAt",
    });
  }
}

export const db = new SvgAnimatorDB();

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({
    id: project.id,
    name: project.name,
    updatedAt: Date.now(),
    project,
  });
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const stored = await db.projects.get(id);
  return stored?.project;
}

export async function listProjects(): Promise<StoredProject[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export function exportProjectFile(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}.svganim`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file: File): Promise<Project> {
  const text = await file.text();
  const project = JSON.parse(text) as Project;
  if (!project.version || !project.elements) {
    throw new Error("Invalid .svganim project file");
  }
  await saveProject(project);
  return project;
}
