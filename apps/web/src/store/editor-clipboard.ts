import type { AnimationTrack, ElementNode, Project } from "@svg-animator/types";
import { createId } from "@svg-animator/types";
import { getChildren } from "@svg-animator/engine";
import type { ElementClipboard } from "./editor-types";

export function flattenLayerIds(project: Project): string[] {
  const result: string[] = [];
  const walk = (parentId: string | null) => {
    for (const el of getChildren(project.elements, parentId)) {
      result.push(el.id);
      walk(el.id);
    }
  };
  walk(null);
  return result;
}

export function collectSubtreeIds(elements: ElementNode[], rootId: string): string[] {
  const ids = [rootId];
  for (const child of getChildren(elements, rootId)) {
    ids.push(...collectSubtreeIds(elements, child.id));
  }
  return ids;
}

export function getCopyRoots(project: Project, selectedIds: string[]): string[] {
  const selectedSet = new Set(selectedIds);
  return selectedIds.filter((id) => {
    const el = project.elements.find((e) => e.id === id);
    return el && (!el.parentId || !selectedSet.has(el.parentId));
  });
}

export function buildClipboard(project: Project, selectedIds: string[]): ElementClipboard | null {
  if (!project || selectedIds.length === 0) return null;
  const roots = getCopyRoots(project, selectedIds);
  const elements: ElementNode[] = [];
  const walk = (id: string) => {
    const el = project.elements.find((e) => e.id === id);
    if (!el) return;
    elements.push(JSON.parse(JSON.stringify(el)) as ElementNode);
    getChildren(project.elements, id).forEach((c) => walk(c.id));
  };
  roots.forEach(walk);
  const idSet = new Set(elements.map((e) => e.id));
  const tracks = project.tracks
    .filter((t) => idSet.has(t.elementId))
    .map((t) => JSON.parse(JSON.stringify(t)) as AnimationTrack);
  return { elements, tracks };
}

export function cloneClipboard(
  clip: ElementClipboard,
  offsetX = 16,
  offsetY = 16
): { elements: ElementNode[]; tracks: AnimationTrack[]; rootIds: string[] } {
  const idMap = new Map<string, string>();
  clip.elements.forEach((el) => idMap.set(el.id, createId()));

  const copiedIds = new Set(clip.elements.map((e) => e.id));
  const roots = clip.elements.filter((e) => !e.parentId || !copiedIds.has(e.parentId));

  const elements = clip.elements.map((el) => {
    const cloned = JSON.parse(JSON.stringify(el)) as ElementNode;
    cloned.id = idMap.get(el.id)!;
    cloned.parentId = el.parentId ? idMap.get(el.parentId) ?? null : null;
    if (roots.some((r) => r.id === el.id)) {
      cloned.transform = {
        ...cloned.transform,
        x: cloned.transform.x + offsetX,
        y: cloned.transform.y + offsetY,
      };
    }
    return cloned;
  });

  const tracks = clip.tracks.map((t) => {
    const cloned = JSON.parse(JSON.stringify(t)) as AnimationTrack;
    cloned.id = createId();
    cloned.elementId = idMap.get(t.elementId)!;
    return cloned;
  });

  return { elements, tracks, rootIds: roots.map((r) => idMap.get(r.id)!) };
}
