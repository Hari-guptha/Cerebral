import { describe, it, expect } from "vitest";
import { createEmptyProject, createId } from "./index";

describe("types", () => {
  it("creates empty project", () => {
    const p = createEmptyProject("Test");
    expect(p.name).toBe("Test");
    expect(p.version).toBe(1);
    expect(p.elements).toEqual([]);
  });

  it("creates unique ids", () => {
    expect(createId()).not.toBe(createId());
  });
});
