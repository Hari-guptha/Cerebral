/** Rough SVG path length estimate for stroke-draw animations (no DOM). */
export function estimatePathLength(d: string): number {
  const segments = buildPathSegments(d);
  if (segments.length === 0) return 100;
  return Math.max(1, segments[segments.length - 1].endDist);
}

interface PathSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  startDist: number;
  endDist: number;
}

function buildPathSegments(d: string): PathSegment[] {
  if (!d?.trim()) return [];

  const tokens = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens || tokens.length < 4) return [];

  const nums = tokens.map(Number).filter((n) => Number.isFinite(n));
  const segments: PathSegment[] = [];
  let dist = 0;

  for (let i = 2; i + 1 < nums.length; i += 2) {
    const x0 = nums[i - 2];
    const y0 = nums[i - 1];
    const x1 = nums[i];
    const y1 = nums[i + 1];
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    if (segLen <= 0) continue;
    segments.push({ x0, y0, x1, y1, startDist: dist, endDist: dist + segLen });
    dist += segLen;
  }

  return segments;
}

export function getPointOnPathD(
  d: string,
  progress: number
): { x: number; y: number } | null {
  const segments = buildPathSegments(d);
  if (segments.length === 0) return null;

  const t = Math.max(0, Math.min(1, progress));
  const total = segments[segments.length - 1].endDist;
  const target = t * total;

  if (target <= 0) {
    const first = segments[0];
    return { x: first.x0, y: first.y0 };
  }

  for (const seg of segments) {
    if (target <= seg.endDist) {
      const local = (target - seg.startDist) / (seg.endDist - seg.startDist || 1);
      return {
        x: seg.x0 + (seg.x1 - seg.x0) * local,
        y: seg.y0 + (seg.y1 - seg.y0) * local,
      };
    }
  }

  const last = segments[segments.length - 1];
  return { x: last.x1, y: last.y1 };
}

/** Tangent angle in degrees along the path at progress (0–1). */
export function getTangentAngleOnPathD(d: string, progress: number): number | null {
  const segments = buildPathSegments(d);
  if (segments.length === 0) return null;

  const t = Math.max(0, Math.min(1, progress));
  const total = segments[segments.length - 1].endDist;
  const target = t * total;
  const epsilon = Math.max(0.5, total * 0.002);

  const p0 = getPointOnPathD(d, Math.max(0, (target - epsilon) / total));
  const p1 = getPointOnPathD(d, Math.min(1, (target + epsilon) / total));
  if (!p0 || !p1) return null;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Polyline vertices extracted from path `d` (M/L segments). */
export function getPathVertices(d: string): { x: number; y: number }[] {
  const segments = buildPathSegments(d);
  if (segments.length === 0) return [];
  const verts: { x: number; y: number }[] = [{ x: segments[0].x0, y: segments[0].y0 }];
  for (const seg of segments) {
    verts.push({ x: seg.x1, y: seg.y1 });
  }
  return verts;
}

export function rebuildPathFromVertices(vertices: { x: number; y: number }[]): string {
  if (vertices.length === 0) return "";
  return vertices
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

export function measurePathLengthFromSvg(svg: SVGSVGElement, elementId: string): number | null {
  const node = svg.querySelector<SVGGeometryElement>(`[data-element-id="${elementId}"]`);
  if (!node || typeof node.getTotalLength !== "function") return null;
  try {
    const len = node.getTotalLength();
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    return null;
  }
}
