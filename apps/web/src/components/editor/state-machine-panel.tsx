"use client";

import type { StateMachine } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StateMachineGraph } from "@/components/editor/state-machine-graph";
import { ensureStateMachine } from "@svg-animator/engine";
import { GitBranch, Play, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function StateMachinePanel() {
  const {
    project,
    currentTime,
    updateStateMachine,
    setCurrentTime,
    setIsPlaying,
    stateMachinePreview,
    setStateMachinePreview,
    stateMachineRuntime,
    addSmInput,
    addSmState,
    addSmTransition,
    fireStateMachineInput,
  } = useEditorStore();

  const [newInput, setNewInput] = useState("");
  const [newState, setNewState] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-600">
        Import SVG to use state machines
      </div>
    );
  }

  const sm = project.stateMachine;

  const enable = () => {
    const updated = ensureStateMachine(project);
    updateStateMachine(updated.stateMachine!);
    setStateMachinePreview(true);
  };

  if (!sm) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <GitBranch className="h-8 w-8 text-neutral-600" />
        <div>
          <p className="text-sm text-white">State Machine</p>
          <p className="mt-1 text-xs text-neutral-500">
            Interactive states linked to timeline segments — hover, click, and custom triggers.
          </p>
        </div>
        <Button onClick={enable}>Create State Machine</Button>
      </div>
    );
  }

  const updateSm = (patch: Partial<StateMachine>) => {
    updateStateMachine({ ...sm, ...patch });
  };

  const previewState = (stateId: string) => {
    const state = sm.states.find((s) => s.id === stateId);
    if (!state) return;
    setCurrentTime(state.timelineStart);
    setIsPlaying(true);
  };

  const activeStateId = stateMachineRuntime?.currentStateId ?? sm.initialStateId;

  return (
    <div className="flex h-full flex-col overflow-auto bg-black">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              State Machine
            </span>
          </div>
          <Button
            variant={stateMachinePreview ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => setStateMachinePreview(!stateMachinePreview)}
          >
            <Zap className="mr-1 h-3 w-3" />
            {stateMachinePreview ? "Live" : "Preview"}
          </Button>
        </div>
        <Input
          className="mt-2 h-7 text-xs"
          value={sm.name}
          onChange={(e) => updateSm({ name: e.target.value })}
        />
      </div>

      <div className="space-y-4 p-4">
        <StateMachineGraph
          machine={sm}
          activeStateId={activeStateId}
          onSelectState={(id) => {
            setSelectedStateId(id);
            previewState(id);
          }}
          onSetInitial={(id) => updateSm({ initialStateId: id })}
        />

        {stateMachinePreview && (
          <div className="flex flex-wrap gap-1">
            {sm.inputs.map((input) => (
              <Button
                key={input.id}
                variant="outline"
                size="sm"
                className="h-6 text-[9px]"
                onClick={() => fireStateMachineInput(input.name)}
              >
                {input.name}
              </Button>
            ))}
          </div>
        )}

        <section>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-600">Inputs</p>
          <div className="space-y-1">
            {sm.inputs.map((input) => (
              <div key={input.id} className="flex items-center gap-2 rounded border border-neutral-800 px-2 py-1.5 text-xs">
                <span className="font-mono text-neutral-400">{input.type}</span>
                <span className="text-white">{input.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <Input
              className="h-7 text-xs"
              placeholder="New input"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
            />
            <Button
              size="sm"
              className="h-7"
              disabled={!newInput.trim()}
              onClick={() => {
                addSmInput(newInput.trim());
                setNewInput("");
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </section>

        <section>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-600">States</p>
          <div className="space-y-2">
            {sm.states.map((state) => (
              <div
                key={state.id}
                className={cn(
                  "rounded border border-neutral-800 p-3",
                  sm.initialStateId === state.id && "border-white/40",
                  selectedStateId === state.id && "ring-1 ring-sky-400/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{state.name}</span>
                  {sm.initialStateId === state.id && (
                    <span className="text-[9px] uppercase text-neutral-500">Initial</span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] text-neutral-500">
                  {state.timelineStart.toFixed(1)}s → {state.timelineEnd.toFixed(1)}s
                </p>
                <Button variant="ghost" size="sm" className="mt-2 h-6 text-[10px]" onClick={() => previewState(state.id)}>
                  <Play className="mr-1 h-3 w-3" /> Preview
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <Input
              className="h-7 text-xs"
              placeholder="State name"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
            />
            <Button
              size="sm"
              className="h-7"
              disabled={!newState.trim()}
              onClick={() => {
                addSmState(newState.trim(), currentTime, Math.min(project.duration, currentTime + 1));
                setNewState("");
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </section>

        <section>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-600">Transitions</p>
          <div className="space-y-1">
            {sm.transitions.map((t) => {
              const from = sm.states.find((s) => s.id === t.fromStateId);
              const to = sm.states.find((s) => s.id === t.toStateId);
              const input = sm.inputs.find((i) => i.id === t.inputId);
              return (
                <div key={t.id} className="rounded border border-neutral-800 px-2 py-1.5 text-[10px] text-neutral-400">
                  <span className="text-white">{from?.name}</span>
                  {" → "}
                  <span className="text-white">{to?.name}</span>
                  <span className="ml-2 text-neutral-600">on {input?.name}</span>
                </div>
              );
            })}
          </div>
          {sm.states.length >= 2 && sm.inputs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 w-full text-[10px]"
              onClick={() => {
                const from = selectedStateId ?? sm.initialStateId;
                const to = sm.states.find((s) => s.id !== from)?.id;
                const input = sm.inputs[0]?.id;
                if (from && to && input) addSmTransition(from, to, input);
              }}
            >
              + Transition from selection
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
