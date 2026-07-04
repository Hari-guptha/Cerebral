import { describe, it, expect } from "vitest";
import { parseSvg } from "./parser";
import { addStrokeDrawOn, addStaggerReveal, addPathMorph } from "./advanced-animators";

const SVG = `<svg viewBox="0 0 100 100"><path id="p1" d="M10 10 L50 50" fill="none" stroke="#000" stroke-width="2"/></svg>`;

describe("advanced animators", () => {
  it("adds stroke draw-on keyframes", () => {
    const { project } = parseSvg(SVG);
    const path = project.elements.find((e) => e.type === "path")!;
    const result = addStrokeDrawOn(project, path.id, 0, 1);
    const track = result.tracks.find((t) => t.property === "strokeDashoffset");
    expect(track?.keyframes).toHaveLength(2);
  });

  it("adds stagger reveal", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect id="r1" x="0" y="0" width="10" height="10"/><rect id="r2" x="20" y="0" width="10" height="10"/></svg>`;
    const { project } = parseSvg(svg);
    const ids = project.elements.map((e) => e.id);
    const result = addStaggerReveal(project, ids, 0, 0.1);
    expect(result.tracks.length).toBeGreaterThan(0);
  });

  it("adds path morph keyframes", () => {
    const { project } = parseSvg(SVG);
    const path = project.elements.find((e) => e.type === "path")!;
    const result = addPathMorph(project, path.id, 0, 1, "M0 0 L10 10", "M0 0 L20 20");
    const track = result.tracks.find((t) => t.property === "pathD");
    expect(track?.keyframes).toHaveLength(2);
  });
});
