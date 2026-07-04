"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AnimatableProperty, LoopMode, ObjectFitMode, TriggerType } from "@svg-animator/types";
import { getTracksForElement, addStrokeDrawOn } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/editor/color-input";

const PROPERTIES: { key: AnimatableProperty; label: string; type: "number" | "color" | "text" }[] = [
  { key: "x", label: "X", type: "number" },
  { key: "y", label: "Y", type: "number" },
  { key: "rotation", label: "Rotation", type: "number" },
  { key: "scaleX", label: "Scale X", type: "number" },
  { key: "scaleY", label: "Scale Y", type: "number" },
  { key: "opacity", label: "Opacity", type: "number" },
  { key: "fill", label: "Fill", type: "color" },
  { key: "stroke", label: "Stroke", type: "color" },
  { key: "strokeWidth", label: "Stroke Width", type: "number" },
  { key: "strokeDashoffset", label: "Stroke Dash Offset", type: "number" },
  { key: "pathProgress", label: "Path Progress", type: "number" },
];

function getValue(
  elementId: string,
  property: AnimatableProperty,
  appliedState: ReturnType<typeof useEditorStore.getState>["appliedState"],
  project: ReturnType<typeof useEditorStore.getState>["project"]
): string | number {
  const state = appliedState[elementId];
  const el = project?.elements.find((e) => e.id === elementId);
  if (!state || !el) return 0;

  switch (property) {
    case "x": return state.transform.x;
    case "y": return state.transform.y;
    case "rotation": return state.transform.rotation;
    case "scaleX": return state.transform.scaleX;
    case "scaleY": return state.transform.scaleY;
    case "opacity": return state.opacity;
    case "fill": return state.fill ?? "";
    case "stroke": return state.stroke ?? "";
    case "strokeWidth": return state.strokeWidth ?? 0;
    case "strokeDashoffset": return state.strokeDashoffset ?? 0;
    case "pathProgress": return state.pathProgress ?? 0;
    case "pathD": return state.pathD ?? "";
    default: return 0;
  }
}

export function InspectorPanel() {
  const {
    project,
    selectedIds,
    appliedState,
    setProperty,
    addKeyframeAtPlayhead,
    currentTime,
    setProjectSettings,
    applyPathMorph,
    setMotionPath,
    setActiveAnimProperty,
    activeAnimProperty,
    updateDrawnElement,
    commitHistory,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      selectedIds: s.selectedIds,
      appliedState: s.appliedState,
      setProperty: s.setProperty,
      addKeyframeAtPlayhead: s.addKeyframeAtPlayhead,
      currentTime: s.currentTime,
      setProjectSettings: s.setProjectSettings,
      applyPathMorph: s.applyPathMorph,
      setMotionPath: s.setMotionPath,
      setActiveAnimProperty: s.setActiveAnimProperty,
      activeAnimProperty: s.activeAnimProperty,
      updateDrawnElement: s.updateDrawnElement,
      commitHistory: s.commitHistory,
    }))
  );
  const [morphTarget, setMorphTarget] = useState("");

  if (!project || selectedIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black p-4 text-xs text-neutral-600">
        Select an element to inspect
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="flex h-full flex-col bg-black p-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Inspector</span>
        <p className="mt-3 text-sm text-white">{selectedIds.length} elements selected</p>
        <p className="mt-2 text-xs text-neutral-500">
          Del delete · Ctrl+C/X/V copy/cut/paste · Ctrl+D duplicate · Ctrl+G group · Arrow keys nudge
        </p>
        <Button className="mt-4" size="sm" onClick={() => useEditorStore.getState().groupSelected()}>
          Group Selection
        </Button>
      </div>
    );
  }

  const elementId = selectedIds[0];
  const el = project.elements.find((e) => e.id === elementId);
  if (!el) return null;

  const tracks = getTracksForElement(project, elementId);

  return (
    <div className="flex h-full flex-col overflow-auto bg-black">
      <div className="border-b border-neutral-800 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Inspector</span>
        <p className="mt-1 truncate text-sm text-white">{el.name}</p>
        <p className="text-[10px] uppercase tracking-wider text-neutral-600">{el.type}</p>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded border border-neutral-800 p-3 space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-neutral-500">Playback</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-neutral-600">Loop</Label>
              <select
                className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                value={project.settings.loop}
                onChange={(e) => setProjectSettings({ loop: e.target.value as LoopMode })}
              >
                <option value="once">Once</option>
                <option value="loop">Loop</option>
                <option value="pingpong">Ping Pong</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-neutral-600">Trigger</Label>
              <select
                className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                value={project.settings.trigger}
                onChange={(e) => setProjectSettings({ trigger: e.target.value as TriggerType })}
              >
                <option value="load">On Load</option>
                <option value="hover">On Hover</option>
                <option value="click">On Click</option>
                <option value="scroll">On Scroll</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Auto Keyframe</Label>
          <input
            type="checkbox"
            checked={project.settings.autoKeyframe}
            onChange={(e) => {
              useEditorStore.setState((s) => {
                if (s.project) s.project.settings.autoKeyframe = e.target.checked;
              });
            }}
          />
        </div>

        {PROPERTIES.map(({ key, label, type }) => (
          <div
            key={key}
            className={cn(
              "space-y-1 rounded px-1 -mx-1",
              activeAnimProperty === key && "bg-neutral-900/60"
            )}
            onFocus={() => setActiveAnimProperty(key)}
          >
            <div className="flex items-center justify-between">
              <Label>{label}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => {
                  setActiveAnimProperty(key);
                  addKeyframeAtPlayhead(elementId, key);
                }}
              >
                ◆ Keyframe
              </Button>
            </div>
            {type === "color" ? (
              <ColorInput
                value={String(getValue(elementId, key, appliedState, project))}
                onFocus={() => setActiveAnimProperty(key)}
                onChange={(val) => {
                  setActiveAnimProperty(key);
                  setProperty(elementId, key, val);
                }}
                disabled={el.locked}
              />
            ) : (
              <Input
                type={type === "number" ? "number" : "text"}
                value={getValue(elementId, key, appliedState, project)}
                step={type === "number" ? (key === "opacity" || key === "pathProgress" ? 0.01 : 1) : undefined}
                onFocus={() => setActiveAnimProperty(key)}
                onChange={(e) => {
                  setActiveAnimProperty(key);
                  const val =
                    type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
                  setProperty(elementId, key, val);
                }}
                disabled={el.locked}
              />
            )}
          </div>
        ))}

        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <Label className="text-[10px] uppercase tracking-wider text-neutral-500">Motion Path</Label>
          <select
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
            value={el.motionPathId ?? ""}
            onChange={(e) => {
              const pathId = e.target.value || null;
              setMotionPath(elementId, pathId, el.motionPathRotate ?? false);
            }}
            disabled={el.locked}
          >
            <option value="">None</option>
            {project.elements
              .filter((p) => p.type === "path" && p.id !== elementId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          {el.motionPathId && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-neutral-500">Progress (0–1)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => addKeyframeAtPlayhead(elementId, "pathProgress")}
                >
                  ◆ Keyframe
                </Button>
              </div>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={getValue(elementId, "pathProgress", appliedState, project) as number}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setProperty(elementId, "pathProgress", Math.max(0, Math.min(1, val)));
                }}
                disabled={el.locked}
              />
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={el.motionPathRotate ?? false}
                  onChange={(e) => setMotionPath(elementId, el.motionPathId ?? null, e.target.checked)}
                />
                Auto-rotate along path
              </label>
              <p className="text-[10px] text-neutral-600">
                X/Y act as offsets from the path position.
              </p>
            </>
          )}
        </div>

        {(el.type === "image" || el.type === "video") && (
          <div className="space-y-3 border-t border-neutral-800 pt-3">
            <Label className="text-[10px] uppercase tracking-wider text-neutral-500">Media</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-neutral-600">Width</Label>
                <Input
                  type="number"
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.width ?? 100)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { width: parseFloat(e.target.value) || 0 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-neutral-600">Height</Label>
                <Input
                  type="number"
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.height ?? 100)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { height: parseFloat(e.target.value) || 0 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-neutral-600">Object Fit</Label>
              <select
                className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                value={String(el.attrs.objectFit ?? "contain")}
                onChange={(e) => {
                  updateDrawnElement(elementId, { objectFit: e.target.value as ObjectFitMode });
                  commitHistory();
                }}
                disabled={el.locked}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-neutral-600">Crop X (0–1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.cropX ?? 0)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { cropX: parseFloat(e.target.value) || 0 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-neutral-600">Crop Y (0–1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.cropY ?? 0)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { cropY: parseFloat(e.target.value) || 0 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-neutral-600">Crop W (0–1)</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.cropWidth ?? 1)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { cropWidth: parseFloat(e.target.value) || 1 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-neutral-600">Crop H (0–1)</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  className="mt-1 h-7 text-xs"
                  value={Number(el.attrs.cropHeight ?? 1)}
                  onChange={(e) => {
                    updateDrawnElement(elementId, { cropHeight: parseFloat(e.target.value) || 1 });
                    commitHistory();
                  }}
                  disabled={el.locked}
                />
              </div>
            </div>
            {el.type === "video" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-neutral-600">Trim In (s)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      className="mt-1 h-7 text-xs"
                      value={Number(el.attrs.trimIn ?? 0)}
                      onChange={(e) => {
                        updateDrawnElement(elementId, { trimIn: parseFloat(e.target.value) || 0 });
                        commitHistory();
                      }}
                      disabled={el.locked}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-neutral-600">Trim Out (s)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      className="mt-1 h-7 text-xs"
                      value={Number(el.attrs.trimOut ?? el.attrs.sourceDuration ?? 0)}
                      onChange={(e) => {
                        updateDrawnElement(elementId, { trimOut: parseFloat(e.target.value) || 0 });
                        commitHistory();
                      }}
                      disabled={el.locked}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-neutral-600">Playback Rate</Label>
                  <Input
                    type="number"
                    min={0.1}
                    max={4}
                    step={0.1}
                    className="mt-1 h-7 text-xs"
                    value={Number(el.attrs.playbackRate ?? 1)}
                    onChange={(e) => {
                      updateDrawnElement(elementId, { playbackRate: parseFloat(e.target.value) || 1 });
                      commitHistory();
                    }}
                    disabled={el.locked}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {el.type === "path" && (
          <div className="space-y-2 border-t border-neutral-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!project) return;
                const updated = addStrokeDrawOn(project, elementId, currentTime, 1);
                useEditorStore.getState().loadProjectData(updated);
              }}
            >
              Add Stroke Draw-On
            </Button>
            <Label className="text-[10px] text-neutral-500">Path Morph (target d)</Label>
            <textarea
              className="w-full rounded border border-neutral-800 bg-neutral-950 p-2 font-mono text-[10px] text-white"
              rows={3}
              placeholder="Paste target path d attribute..."
              value={morphTarget}
              onChange={(e) => setMorphTarget(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!morphTarget.trim()}
              onClick={() => {
                applyPathMorph(elementId, morphTarget.trim());
                setMorphTarget("");
              }}
            >
              Apply Path Morph
            </Button>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="mt-4 border-t border-neutral-800 pt-3">
            <Label className="mb-2 block">Keyframes @ {currentTime.toFixed(2)}s</Label>
            {tracks.map((track) => (
              <div key={track.id} className="mb-2 text-xs text-neutral-500">
                <span className="font-medium text-neutral-300">{track.property}</span>
                <ul className="ml-2 mt-1 space-y-0.5">
                  {track.keyframes.map((kf) => (
                    <li key={kf.id} className="flex justify-between">
                      <span>{kf.time.toFixed(2)}s</span>
                      <span>{String(kf.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
