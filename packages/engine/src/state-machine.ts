import type { Project, StateMachine } from "@svg-animator/types";
import { createId } from "@svg-animator/types";
import { createDefaultStateMachine } from "./render-snapshot";

export interface StateMachineRuntime {
  currentStateId: string;
  isPlaying: boolean;
  localTime: number;
}

export function initStateMachine(sm: StateMachine): StateMachineRuntime {
  return {
    currentStateId: sm.initialStateId,
    isPlaying: true,
    localTime: 0,
  };
}

export function fireInput(
  sm: StateMachine,
  runtime: StateMachineRuntime,
  inputId: string
): StateMachineRuntime {
  const transition = sm.transitions.find(
    (t) => t.fromStateId === runtime.currentStateId && t.inputId === inputId
  );
  if (!transition) return runtime;

  const nextState = sm.states.find((s) => s.id === transition.toStateId);
  if (!nextState) return runtime;

  return {
    currentStateId: transition.toStateId,
    isPlaying: true,
    localTime: nextState.timelineStart,
  };
}

export function fireInputByName(
  sm: StateMachine,
  runtime: StateMachineRuntime,
  inputName: string
): StateMachineRuntime {
  const input = sm.inputs.find((i) => i.name === inputName);
  if (!input) return runtime;
  return fireInput(sm, runtime, input.id);
}

export function tickStateMachine(
  project: Project,
  runtime: StateMachineRuntime,
  delta: number
): { runtime: StateMachineRuntime; globalTime: number } {
  const sm = project.stateMachine;
  if (!sm) return { runtime, globalTime: runtime.localTime };

  const state = sm.states.find((s) => s.id === runtime.currentStateId);
  if (!state) return { runtime, globalTime: runtime.localTime };

  let localTime = runtime.localTime + delta;
  let currentStateId = runtime.currentStateId;

  if (localTime >= state.timelineEnd) {
    if (state.loop) {
      localTime = state.timelineStart;
    } else {
      localTime = state.timelineEnd;
    }
  }

  return {
    runtime: { ...runtime, currentStateId, localTime },
    globalTime: localTime,
  };
}

export function exportStateMachinePlayer(project: Project): string {
  const sm = project.stateMachine;
  if (!sm) return "";

  return `
// Cerebral State Machine Player
(function() {
  const machine = ${JSON.stringify(sm)};
  let currentStateId = machine.initialStateId;
  const svg = document.querySelector('svg');
  if (!svg) return;

  function seekTo(time) {
    window.__cerebralSeek && window.__cerebralSeek(time);
  }

  function goToState(stateId) {
    const state = machine.states.find(s => s.id === stateId);
    if (!state) return;
    currentStateId = stateId;
    seekTo(state.timelineStart);
  }

  function fire(inputName) {
    const input = machine.inputs.find(i => i.name === inputName);
    if (!input) return;
    const t = machine.transitions.find(
      tr => tr.fromStateId === currentStateId && tr.inputId === input.id
    );
    if (t) goToState(t.toStateId);
  }

  svg.addEventListener('mouseenter', () => fire('hover'));
  svg.addEventListener('mouseleave', () => fire('unhover'));
  svg.addEventListener('click', () => fire('click'));

  goToState(machine.initialStateId);
})();
`.trim();
}

export function ensureStateMachine(project: Project): Project {
  if (project.stateMachine) return project;
  return { ...project, stateMachine: createDefaultStateMachine(project.duration) };
}

export function addStateMachineInput(
  project: Project,
  name: string,
  type: "trigger" | "bool" | "number" = "trigger"
): Project {
  if (!project.stateMachine) return project;
  const sm = project.stateMachine;
  return {
    ...project,
    stateMachine: {
      ...sm,
      inputs: [...sm.inputs, { id: createId(), name, type }],
    },
  };
}

export function addStateMachineState(
  project: Project,
  name: string,
  timelineStart: number,
  timelineEnd: number
): Project {
  if (!project.stateMachine) return project;
  const sm = project.stateMachine;
  const id = createId();
  return {
    ...project,
    stateMachine: {
      ...sm,
      states: [...sm.states, { id, name, timelineStart, timelineEnd }],
    },
  };
}

export function addStateTransition(
  project: Project,
  fromStateId: string,
  toStateId: string,
  inputId: string
): Project {
  if (!project.stateMachine) return project;
  const sm = project.stateMachine;
  return {
    ...project,
    stateMachine: {
      ...sm,
      transitions: [
        ...sm.transitions,
        { id: createId(), fromStateId, toStateId, inputId },
      ],
    },
  };
}
