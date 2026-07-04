import type { Project } from "@svg-animator/types";
import {
  sampleProject,
  renderProjectSnapshot,
  initStateMachine,
  fireInputByName,
  tickStateMachine,
  type StateMachineRuntime,
} from "@svg-animator/engine";

export interface CerebralPlayerOptions {
  container: HTMLElement | string;
  project: Project;
  autoplay?: boolean;
  loop?: boolean;
  interactive?: boolean;
  onTimeUpdate?: (time: number) => void;
  onStateChange?: (stateId: string) => void;
}

export class CerebralPlayer {
  private container: HTMLElement;
  private project: Project;
  private time = 0;
  private playing = false;
  private raf = 0;
  private lastTs = 0;
  private svg: SVGSVGElement | null = null;
  private smRuntime: StateMachineRuntime | null = null;
  private opts: CerebralPlayerOptions;

  constructor(options: CerebralPlayerOptions) {
    this.opts = options;
    this.project = options.project;
    this.container =
      typeof options.container === "string"
        ? (document.querySelector(options.container) as HTMLElement)
        : options.container;
    if (!this.container) throw new Error("CerebralPlayer: container not found");

    if (this.project.stateMachine) {
      this.smRuntime = initStateMachine(this.project.stateMachine);
      const initial = this.project.stateMachine.states.find(
        (s) => s.id === this.project.stateMachine!.initialStateId
      );
      this.time = initial?.timelineStart ?? 0;
    }

    this.mount();
    if (options.interactive !== false && this.project.stateMachine) {
      this.wireInteractions();
    }
    if (options.autoplay) this.play();
  }

  private mount() {
    this.container.innerHTML = renderProjectSnapshot(this.project, this.time);
    this.svg = this.container.querySelector("svg");
  }

  private render() {
    if (!this.svg) {
      this.mount();
      return;
    }
    const state = sampleProject(this.project, this.time);
    for (const el of this.project.elements) {
      const node = this.svg.querySelector(`[data-element-id="${el.id}"]`) as SVGElement | null;
      if (!node) continue;
      const s = state[el.id];
      if (!s) continue;
      const parts: string[] = [];
      if (s.transform.x || s.transform.y) parts.push(`translate(${s.transform.x}, ${s.transform.y})`);
      if (s.transform.rotation) {
        parts.push(`rotate(${s.transform.rotation}, ${s.transform.originX}, ${s.transform.originY})`);
      }
      if (s.transform.scaleX !== 1 || s.transform.scaleY !== 1) {
        parts.push(`scale(${s.transform.scaleX}, ${s.transform.scaleY})`);
      }
      node.setAttribute("transform", parts.join(" ") || "none");
      node.setAttribute("opacity", String(s.opacity));
      if (s.fill) node.setAttribute("fill", s.fill);
      if (s.stroke) node.setAttribute("stroke", s.stroke);
      if (s.strokeWidth != null) node.setAttribute("stroke-width", String(s.strokeWidth));
      if (s.pathD && node instanceof SVGPathElement) node.setAttribute("d", s.pathD);
    }
    this.opts.onTimeUpdate?.(this.time);
  }

  private wireInteractions() {
    const sm = this.project.stateMachine;
    if (!sm || !this.svg) return;
    this.svg.addEventListener("mouseenter", () => this.fire("hover"));
    this.svg.addEventListener("mouseleave", () => this.fire("unhover"));
    this.svg.addEventListener("click", () => this.fire("click"));
  }

  fire(inputName: string) {
    const sm = this.project.stateMachine;
    if (!sm || !this.smRuntime) return;
    const prev = this.smRuntime.currentStateId;
    this.smRuntime = fireInputByName(sm, this.smRuntime, inputName);
    if (this.smRuntime.currentStateId !== prev) {
      this.time = this.smRuntime.localTime;
      this.opts.onStateChange?.(this.smRuntime.currentStateId);
      this.render();
    }
  }

  setInput(_name: string, _value: boolean | number) {
    // v2.1: bool/number inputs
  }

  seek(time: number) {
    this.time = Math.max(0, Math.min(time, this.project.duration));
    this.render();
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastTs = 0;
    const tick = (ts: number) => {
      if (!this.playing) return;
      if (this.lastTs === 0) this.lastTs = ts;
      const delta = (ts - this.lastTs) / 1000;
      this.lastTs = ts;

      if (this.smRuntime && this.project.stateMachine) {
        const result = tickStateMachine(this.project, this.smRuntime, delta);
        this.smRuntime = result.runtime;
        this.time = result.globalTime;
      } else {
        this.time += delta;
        const loop = this.opts.loop ?? this.project.settings.loop === "loop";
        if (this.time >= this.project.duration) {
          this.time = loop ? 0 : this.project.duration;
          if (!loop) this.pause();
        }
      }

      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.pause();
    this.container.innerHTML = "";
  }
}

export { sampleProject, renderProjectSnapshot } from "@svg-animator/engine";
