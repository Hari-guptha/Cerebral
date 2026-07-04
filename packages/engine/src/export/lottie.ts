import type { ExportOptions, ExportResult, Project } from "@svg-animator/types";
import { buildElementShapes, toLottieKeyframes, toLottiePositionKeyframes } from "./lottie-shapes";

export function exportLottie(project: Project, options: ExportOptions): ExportResult {
  const fps = project.fps;
  const warnings: string[] = [];

  const layers = project.elements
    .filter((e) => e.type !== "group" && e.visible)
    .map((el, i) => {
      const tracks = project.tracks.filter((t) => t.elementId === el.id && t.enabled);
      const posX = tracks.find((t) => t.property === "x");
      const posY = tracks.find((t) => t.property === "y");
      const opacity = tracks.find((t) => t.property === "opacity");
      const rotation = tracks.find((t) => t.property === "rotation");
      const scaleX = tracks.find((t) => t.property === "scaleX");
      const scaleY = tracks.find((t) => t.property === "scaleY");

      const shapes = buildElementShapes(el);
      if (shapes.length === 0) {
        warnings.push(`Skipped ${el.name}: no exportable shape geometry`);
      }

      const hasPosAnim = Boolean(posX?.keyframes.length || posY?.keyframes.length);

      return {
        ddd: 0,
        ind: i + 1,
        ty: 4,
        nm: el.name,
        sr: 1,
        ks: {
          o: opacity?.keyframes.length
            ? toLottieKeyframes(opacity.keyframes, fps, true)
            : { a: 0, k: (typeof el.attrs.opacity === "number" ? el.attrs.opacity : 1) * 100, ix: 11 },
          r: rotation?.keyframes.length
            ? toLottieKeyframes(rotation.keyframes, fps)
            : { a: 0, k: el.transform.rotation, ix: 10 },
          p: hasPosAnim
            ? toLottiePositionKeyframes(
                posX?.keyframes ?? [],
                posY?.keyframes ?? [],
                fps,
                el.transform.x,
                el.transform.y
              )
            : { a: 0, k: [el.transform.x, el.transform.y, 0], ix: 2 },
          a: { a: 0, k: [0, 0, 0], ix: 1 },
          s:
            scaleX?.keyframes.length || scaleY?.keyframes.length
              ? {
                  a: 1,
                  k: (scaleX?.keyframes.length ? scaleX.keyframes : scaleY!.keyframes).map((kf, idx) => ({
                    t: Math.round(kf.time * fps),
                    s: [
                      ((scaleX?.keyframes[idx]?.value as number) ?? el.transform.scaleX) * 100,
                      ((scaleY?.keyframes[idx]?.value as number) ?? el.transform.scaleY) * 100,
                      100,
                    ],
                  })),
                  ix: 6,
                }
              : { a: 0, k: [el.transform.scaleX * 100, el.transform.scaleY * 100, 100], ix: 6 },
        },
        ao: 0,
        shapes,
        ip: 0,
        op: Math.round(project.duration * fps),
        st: 0,
        bm: 0,
      };
    })
    .filter((layer) => layer.shapes.length > 0);

  if (layers.length === 0) {
    warnings.push("No layers with shape geometry were exported");
  }

  const lottie = {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op: Math.round(project.duration * fps),
    w: project.canvas.width,
    h: project.canvas.height,
    nm: project.name,
    ddd: 0,
    assets: [],
    layers,
  };

  return {
    format: "lottie",
    filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}.json`,
    mimeType: "application/json",
    content: JSON.stringify(lottie, null, 2),
    warnings,
  };
}
