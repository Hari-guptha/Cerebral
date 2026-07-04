import type { Project } from "@svg-animator/types";
import type { HistoryEntry, HistoryStoreSlice } from "./editor-types";

export function snapshot(state: HistoryStoreSlice): HistoryEntry {
  return {
    project: JSON.parse(JSON.stringify(state.project)) as Project,
    selectedIds: [...state.selectedIds],
    selectionAnchorId: state.selectionAnchorId,
  };
}

export function pushHistory(state: HistoryStoreSlice): void {
  if (!state.project) return;
  const entry = snapshot(state);
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(entry);
  if (newHistory.length > 50) newHistory.shift();
  state.history = newHistory;
  state.historyIndex = newHistory.length - 1;
}

export function initHistory(state: HistoryStoreSlice, project: Project): void {
  state.history = [{
    project: JSON.parse(JSON.stringify(project)),
    selectedIds: [],
    selectionAnchorId: null,
  }];
  state.historyIndex = 0;
}

export function canUndo(state: HistoryStoreSlice): boolean {
  return state.historyIndex > 0;
}

export function canRedo(state: HistoryStoreSlice): boolean {
  return state.historyIndex >= 0 && state.historyIndex < state.history.length - 1;
}

export function applyHistoryEntry(state: HistoryStoreSlice, index: number): void {
  const entry = state.history[index];
  if (!entry) return;
  state.historyIndex = index;
  state.project = JSON.parse(JSON.stringify(entry.project)) as Project;
  state.selectedIds = [...entry.selectedIds];
  state.selectionAnchorId = entry.selectionAnchorId;
}
