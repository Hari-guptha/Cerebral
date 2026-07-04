import type { Project } from "@svg-animator/types";
import * as Y from "yjs";

export const YJS_ORIGIN_REMOTE = "yjs-remote";
export const YJS_ORIGIN_LOCAL = "yjs-local";
export const PROJECT_MAP_KEY = "project";

export function createProjectDoc(initial?: Project): Y.Doc {
  const doc = new Y.Doc();
  if (initial) {
    writeProjectToDoc(doc, initial, YJS_ORIGIN_LOCAL);
  }
  return doc;
}

export function readProjectFromDoc(doc: Y.Doc): Project | null {
  const json = doc.getMap(PROJECT_MAP_KEY).get("json");
  if (typeof json !== "string") return null;
  try {
    return JSON.parse(json) as Project;
  } catch {
    return null;
  }
}

export function writeProjectToDoc(doc: Y.Doc, project: Project, origin = YJS_ORIGIN_LOCAL): void {
  doc.transact(() => {
    doc.getMap(PROJECT_MAP_KEY).set("json", JSON.stringify(project));
  }, origin);
}

export function encodeUpdate(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function applyUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update, YJS_ORIGIN_REMOTE);
}

export function updatesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
