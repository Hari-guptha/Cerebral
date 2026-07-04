import { describe, it, expect } from "vitest";
import { parseSvg } from "./parser";
import { sampleProject, addKeyframe } from "./animation";
import { getPointOnPathD } from "./path-utils";
import { exportCss, exportJs, exportLottie } from "./export";

const MINI_SVG = `<svg viewBox="0 0 50 50"><rect id="r1" x="5" y="5" width="10" height="10" fill="red"/></svg>`;

describe("parser", () => {
  it("parses simple SVG", () => {
    const { project } = parseSvg(MINI_SVG);
    expect(project.elements).toHaveLength(1);
    expect(project.elements[0].type).toBe("rect");
    expect(project.canvas.viewBox).toBe("0 0 50 50");
  });

  it("throws on invalid SVG", () => {
    expect(() => parseSvg("<not-svg")).toThrow();
  });
});

describe("animation", () => {
  it("samples interpolated values", () => {
    const { project } = parseSvg(MINI_SVG);
    const el = project.elements[0];
    let p = addKeyframe(project, el.id, "opacity", 0, 1);
    p = addKeyframe(p, el.id, "opacity", 2, 0);
    const mid = sampleProject(p, 1);
    expect(mid[el.id].opacity).toBeCloseTo(0.5, 0);
  });
});

describe("motion path", () => {
  it("samples point along path d", () => {
    const start = getPointOnPathD("M 0 0 L 100 0", 0);
    const end = getPointOnPathD("M 0 0 L 100 0", 1);
    expect(start).toEqual({ x: 0, y: 0 });
    expect(end).toEqual({ x: 100, y: 0 });
  });

  it("offsets element along motion path", () => {
    const { project } = parseSvg(
      `<svg viewBox="0 0 100 100"><path id="p1" d="M 0 0 L 100 0"/><circle id="c1" cx="0" cy="0" r="5"/></svg>`
    );
    const path = project.elements.find((e) => e.type === "path")!;
    const circle = project.elements.find((e) => e.type === "circle")!;
    const withPath = {
      ...project,
      elements: project.elements.map((el) =>
        el.id === circle.id ? { ...el, motionPathId: path.id } : el
      ),
    };
    let p = addKeyframe(withPath, circle.id, "pathProgress", 0, 0);
    p = addKeyframe(p, circle.id, "pathProgress", 1, 1);
    const mid = sampleProject(p, 0.5);
    expect(mid[circle.id].transform.x).toBeCloseTo(50, 0);
    expect(mid[circle.id].transform.y).toBeCloseTo(0, 0);
  });
});

describe("exporters", () => {
  it("exports CSS", () => {
    const { project } = parseSvg(MINI_SVG);
    const el = project.elements[0];
    let p = addKeyframe(project, el.id, "opacity", 0, 1);
    p = addKeyframe(p, el.id, "opacity", 1, 0);
    const result = exportCss(p, { format: "css" });
    expect(result.content).toContain("@keyframes");
    expect(result.content).toContain("<style>");
  });

  it("exports JS player", () => {
    const { project } = parseSvg(MINI_SVG);
    const result = exportJs(project, { format: "js" });
    expect(result.content).toContain("<script");
  });

  it("exports Lottie", () => {
    const { project } = parseSvg(MINI_SVG);
    const result = exportLottie(project, { format: "lottie" });
    const json = JSON.parse(result.content as string);
    expect(json.fr).toBe(30);
    expect(json.layers).toBeDefined();
  });
});
