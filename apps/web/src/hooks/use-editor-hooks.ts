"use client";

import { useEffect, useRef } from "react";
import { startTransition } from "react";
import { tickStateMachine, sampleProject } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";
import { checkDatabaseStatus, isDatabaseOnline, saveAutoVersion } from "@/lib/project-api";
import { quantizeTimeToFrame, reconcileAppliedState } from "@/lib/applied-state";

export function usePlaybackLoop() {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pingPongReverse = useRef(false);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (now: number) => {
      const state = useEditorStore.getState();
      if (state.isPlaying && state.project) {
        if (lastTimeRef.current === 0) lastTimeRef.current = now;
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        const duration = state.project.duration;
        const fps = state.project.fps;
        const loop = state.project.settings.loop;
        const workIn = state.project.settings.workAreaIn ?? 0;
        const workOut = state.project.settings.workAreaOut ?? duration;

        if (
          state.stateMachinePreview &&
          state.project.stateMachine &&
          state.stateMachineRuntime
        ) {
          const result = tickStateMachine(state.project, state.stateMachineRuntime, delta);
          startTransition(() => {
            useEditorStore.setState((s) => {
              if (!s.project) return;
              s.stateMachineRuntime = result.runtime;
              s.currentTime = result.globalTime;
              const sampled = sampleProject(s.project, result.globalTime);
              s.appliedState = reconcileAppliedState(s.appliedState, sampled);
            });
          });
        } else {
          let next = state.currentTime + (pingPongReverse.current ? -delta : delta);

          if (loop === "pingpong") {
            if (next >= workOut) {
              next = workOut;
              pingPongReverse.current = true;
            } else if (next <= workIn) {
              next = workIn;
              pingPongReverse.current = false;
            }
          } else if (next >= workOut) {
            if (loop === "loop") {
              next = workIn;
              lastFrameRef.current = null;
            } else {
              next = workOut;
              state.setIsPlaying(false);
            }
          } else if (next < workIn) {
            next = workIn;
          }

          const frameTime = quantizeTimeToFrame(next, fps);
          const frameIndex = Math.round(frameTime * fps);

          if (lastFrameRef.current !== frameIndex) {
            lastFrameRef.current = frameIndex;
            startTransition(() => {
              state.setCurrentTime(frameTime);
            });
          }
        }
      } else {
        lastTimeRef.current = 0;
        lastFrameRef.current = null;
        pingPongReverse.current = false;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}

export function useAutosave() {
  const lastAutoVersion = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      useEditorStore.getState().autosave();
    }, 30000);

    const versionInterval = setInterval(async () => {
      const state = useEditorStore.getState();
      if (!state.project) return;

      const dbOnline = await isDatabaseOnline();
      if (!dbOnline) return;

      const now = Date.now();
      if (now - lastAutoVersion.current < 180000) return;
      lastAutoVersion.current = now;

      await saveAutoVersion(state.project);
    }, 60000);

    const onBlur = () => useEditorStore.getState().autosave();
    window.addEventListener("blur", onBlur);

    return () => {
      clearInterval(interval);
      clearInterval(versionInterval);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const state = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // --- Playback ---
      if (e.code === "Space" && !mod) {
        e.preventDefault();
        state.setIsPlaying(!state.isPlaying);
        return;
      }

      // --- Undo / Redo ---
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        state.undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        state.redo();
        return;
      }

      // --- Clipboard ---
      if (mod && key === "c") {
        e.preventDefault();
        if (state.selectedKeyframeRefs.length > 0) {
          state.copySelectedKeyframes();
        } else {
          state.copySelected();
        }
        return;
      }
      if (mod && key === "x") {
        e.preventDefault();
        if (state.selectedKeyframeRefs.length > 0) {
          state.cutSelectedKeyframes();
        } else {
          state.cutSelected();
        }
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        if (state.lastClipboardType === "keyframes" && state.keyframeClipboard?.length) {
          state.pasteKeyframes();
        } else {
          state.pasteClipboard();
        }
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (state.selectedKeyframeRefs.length > 0) {
          state.duplicateSelectedKeyframes();
        } else {
          state.duplicateSelected();
        }
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        state.selectAll();
        return;
      }

      // --- File / structure ---
      if (mod && key === "r") {
        e.preventDefault();
        const id = state.lastSelectedId ?? state.selectedIds[0];
        if (id) state.setRenamingLayerId(id);
        return;
      }
      if (mod && key === "s" && !e.shiftKey) {
        e.preventDefault();
        state.autosave();
        return;
      }
      if (mod && key === "g" && !e.shiftKey) {
        e.preventDefault();
        state.groupSelected();
        return;
      }
      if (mod && key === "g" && e.shiftKey) {
        e.preventDefault();
        state.ungroupSelected();
        return;
      }

      // --- Delete ---
      if (e.code === "Delete" || e.code === "Backspace") {
        if (state.selectedKeyframeRefs.length > 0 && state.project) {
          e.preventDefault();
          state.deleteSelectedKeyframes();
          return;
        }
        if (state.selectedIds.length > 0 && state.project) {
          e.preventDefault();
          state.deleteSelected();
        }
        return;
      }

      // --- Escape ---
      if (e.code === "Escape") {
        e.preventDefault();
        if (state.selectedKeyframeRefs.length > 0) {
          state.deselectKeyframes();
          return;
        }
        state.deselectAll();
        state.setActiveTool("select");
        return;
      }

      // --- Zoom (editor canvas only, when pointer is over canvas) ---
      if (
        mod &&
        state.editorCanvasHovered &&
        state.canvasViewMode === "editor" &&
        (e.code === "Equal" || e.code === "NumpadAdd")
      ) {
        e.preventDefault();
        state.setZoom(state.zoom + 0.1);
        return;
      }
      if (
        mod &&
        state.editorCanvasHovered &&
        state.canvasViewMode === "editor" &&
        (e.code === "Minus" || e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
        state.setZoom(state.zoom - 0.1);
        return;
      }
      if (mod && key === "0" && state.editorCanvasHovered && state.canvasViewMode === "editor") {
        e.preventDefault();
        state.setZoom(1);
        state.setPan(0, 0);
        return;
      }

      // --- Timeline ---
      if (e.code === "Home" && state.project) {
        e.preventDefault();
        state.setCurrentTime(0);
        return;
      }
      if (e.code === "End" && state.project) {
        e.preventDefault();
        state.setCurrentTime(state.project.duration);
        return;
      }

      // --- Nudge keyframes in time ---
      if (
        !mod &&
        state.selectedKeyframeRefs.length > 0 &&
        state.project &&
        (e.code === "ArrowLeft" || e.code === "ArrowRight")
      ) {
        e.preventDefault();
        const frameStep = 1 / state.project.fps;
        const steps = e.shiftKey ? 10 : 1;
        const dt = (e.code === "ArrowLeft" ? -steps : steps) * frameStep;
        state.nudgeSelectedKeyframes(dt);
        return;
      }

      // --- Nudge selection ---
      if (
        !mod &&
        state.selectedIds.length > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.code === "ArrowLeft" ? -step : e.code === "ArrowRight" ? step : 0;
        const dy = e.code === "ArrowUp" ? -step : e.code === "ArrowDown" ? step : 0;
        state.nudgeSelected(dx, dy);
        return;
      }

      // --- Keyframe insert (I / K) ---
      if (!mod && (key === "i" || key === "k") && state.selectedIds.length > 0 && state.project) {
        e.preventDefault();
        state.insertKeyframeAtPlayhead();
        return;
      }

      // --- Drawing tools (no modifier) ---
      if (!mod && !e.altKey) {
        const toolMap: Record<string, import("@svg-animator/types").DrawingTool> = {
          v: "select",
          r: "rectangle",
          e: "ellipse",
          l: "line",
          p: "pen",
          m: "motionPath",
          t: "text",
        };
        const tool = toolMap[key];
        if (tool) {
          e.preventDefault();
          state.setActiveTool(tool);
        }
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);
}
