import type { ExportOptions, ExportResult, Project } from "@svg-animator/types";
import { renderProjectSnapshot } from "../render-snapshot";
import { exportStateMachinePlayer } from "../state-machine";

/** Standalone HTML page with inlined Cerebral runtime (keyframes + optional state machine). */
export function exportHtml(project: Project, options: ExportOptions): ExportResult {
  const warnings: string[] = [
    "HTML embed uses inline JS runtime — host on same origin or serve as static file",
  ];

  const loopMode = options.loop ?? project.settings.loop;
  const projectJson = JSON.stringify(project);
  const initialSvg = renderProjectSnapshot(project, 0);
  const runtime = CEREBRAL_RUNTIME.replace("__LOOP_MODE__", JSON.stringify(loopMode));

  const smScript = project.stateMachine
    ? `<script>${exportStateMachinePlayer(project)}</script>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(project.name)} — Cerebral</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; }
    #cerebral-root { max-width: 100%; }
    #cerebral-root svg { display: block; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div id="cerebral-root">${initialSvg}</div>
  <script id="cerebral-data" type="application/json">${projectJson}</script>
  <script>
${runtime}
  </script>
  ${smScript}
</body>
</html>`;

  return {
    format: "html",
    filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}.html`,
    mimeType: "text/html",
    content: html,
    warnings,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CEREBRAL_RUNTIME = `
(function () {
  var dataEl = document.getElementById("cerebral-data");
  var project = JSON.parse(dataEl.textContent);
  var root = document.getElementById("cerebral-root");
  var time = 0;
  var playing = true;
  var loop = __LOOP_MODE__;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function sampleTrack(kfs, t) {
    if (!kfs.length) return undefined;
    kfs = kfs.slice().sort(function (a, b) { return a.time - b.time; });
    if (t <= kfs[0].time) return kfs[0].value;
    if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
    for (var i = 0; i < kfs.length - 1; i++) {
      var k0 = kfs[i], k1 = kfs[i + 1];
      if (t >= k0.time && t <= k1.time) {
        if (k0.hold) return k0.value;
        var u = (t - k0.time) / (k1.time - k0.time || 1);
        u = ease(u);
        if (typeof k0.value === "number" && typeof k1.value === "number") return lerp(k0.value, k1.value, u);
        return k1.value;
      }
    }
    return kfs[kfs.length - 1].value;
  }

  function getPathPoint(d, progress) {
    var nums = (d.match(/-?\\d*\\.?\\d+(?:e[-+]?\\d+)?/gi) || []).map(Number);
    var segs = [], dist = 0;
    for (var i = 2; i + 1 < nums.length; i += 2) {
      var x0 = nums[i-2], y0 = nums[i-1], x1 = nums[i], y1 = nums[i+1];
      var len = Math.hypot(x1-x0, y1-y0);
      if (len <= 0) continue;
      segs.push({ x0:x0, y0:y0, x1:x1, y1:y1, start:dist, end:dist+len });
      dist += len;
    }
    if (!segs.length) return null;
    var target = Math.max(0, Math.min(1, progress)) * segs[segs.length-1].end;
    for (var j = 0; j < segs.length; j++) {
      var s = segs[j];
      if (target <= s.end) {
        var local = (target - s.start) / (s.end - s.start || 1);
        return { x: s.x0 + (s.x1-s.x0)*local, y: s.y0 + (s.y1-s.y0)*local };
      }
    }
    var last = segs[segs.length-1];
    return { x: last.x1, y: last.y1 };
  }

  function sample(time) {
    var state = {};
    project.elements.forEach(function (el) {
      state[el.id] = {
        transform: Object.assign({}, el.transform),
        opacity: typeof el.attrs.opacity === "number" ? el.attrs.opacity : 1,
        fill: el.attrs.fill, stroke: el.attrs.stroke,
        strokeWidth: el.attrs["stroke-width"] || 0,
        pathD: el.attrs.d || "",
        pathProgress: 0
      };
    });
    project.tracks.forEach(function (track) {
      if (!track.enabled || !track.keyframes.length) return;
      var val = sampleTrack(track.keyframes, time);
      if (val === undefined) return;
      var s = state[track.elementId];
      if (!s) return;
      switch (track.property) {
        case "x": s.transform.x = val; break;
        case "y": s.transform.y = val; break;
        case "rotation": s.transform.rotation = val; break;
        case "scaleX": s.transform.scaleX = val; break;
        case "scaleY": s.transform.scaleY = val; break;
        case "opacity": s.opacity = val; break;
        case "fill": s.fill = val; break;
        case "stroke": s.stroke = val; break;
        case "strokeWidth": s.strokeWidth = val; break;
        case "pathD": s.pathD = val; break;
        case "pathProgress": s.pathProgress = val; break;
      }
    });
    project.elements.forEach(function (el) {
      if (!el.motionPathId) return;
      var pathEl = project.elements.find(function (e) { return e.id === el.motionPathId; });
      if (!pathEl) return;
      var s = state[el.id];
      var pt = getPathPoint(String(pathEl.attrs.d || ""), s.pathProgress || 0);
      if (!pt) return;
      s.transform.x = pt.x + s.transform.x;
      s.transform.y = pt.y + s.transform.y;
    });
    return state;
  }

  function render() {
    var st = sample(time);
    var svg = root.querySelector("svg");
    if (!svg) return;
    project.elements.forEach(function (el) {
      var node = svg.querySelector('[data-element-id="' + el.id + '"]');
      var s = st[el.id];
      if (!node || !s) return;
      var parts = [];
      if (s.transform.x || s.transform.y) parts.push("translate(" + s.transform.x + "," + s.transform.y + ")");
      if (s.transform.rotation) parts.push("rotate(" + s.transform.rotation + "," + s.transform.originX + "," + s.transform.originY + ")");
      if (s.transform.scaleX !== 1 || s.transform.scaleY !== 1) parts.push("scale(" + s.transform.scaleX + "," + s.transform.scaleY + ")");
      node.setAttribute("transform", parts.join(" ") || "none");
      node.setAttribute("opacity", String(s.opacity));
      if (s.fill) node.setAttribute("fill", s.fill);
      if (s.stroke) node.setAttribute("stroke", s.stroke);
      if (s.strokeWidth != null) node.setAttribute("stroke-width", String(s.strokeWidth));
      if (s.pathD && node.tagName === "path") node.setAttribute("d", s.pathD);
    });
  }

  var last = 0;
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    time += (ts - last) / 1000;
    last = ts;
    if (time >= project.duration) {
      time = loop === "loop" ? 0 : project.duration;
      if (loop !== "loop") { render(); return; }
    }
    render();
    requestAnimationFrame(tick);
  }
  render();
  requestAnimationFrame(tick);
})();
`.trim();
