import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import { parseSvg } from "./parser";
import { addKeyframe } from "./animation";
import { exportSmil } from "./export/smil";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleSvg = readFileSync(resolve(__dirname, "./__fixtures__/sample-icon.svg"), "utf-8");

describe("SMIL round-trip spike", () => {
  it("parseSvg → keyframe x/y/opacity → SMIL export", () => {
    const { project } = parseSvg(sampleSvg, "Sample Icon");
    expect(project.elements.length).toBeGreaterThanOrEqual(3);

    const circle = project.elements.find((e) => e.svgId === "circle_main");
    expect(circle).toBeDefined();

    let p = project;
    p = addKeyframe(p, circle!.id, "x", 0, 0);
    p = addKeyframe(p, circle!.id, "x", 2, 30);
    p = addKeyframe(p, circle!.id, "y", 0, 0);
    p = addKeyframe(p, circle!.id, "y", 2, 10);
    p = addKeyframe(p, circle!.id, "opacity", 0, 1);
    p = addKeyframe(p, circle!.id, "opacity", 2, 0.2);

    expect(p.tracks.length).toBeGreaterThanOrEqual(3);

    const result = exportSmil(p, { format: "smil" });
    expect(result.content).toContain("<animate");
    expect(result.content).toContain("circle_main");
    expect(result.content).toContain('viewBox="0 0 100 100"');
    expect(result.mimeType).toBe("image/svg+xml");
  });
});
