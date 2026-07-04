"use client";

import type { Project } from "@svg-animator/types";
import { renderProjectSnapshot } from "@svg-animator/engine";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { getVideoTimeAtPlayhead } from "@/lib/media-import";

async function seekVideoFrame(
  src: string,
  time: number
): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.onloadeddata = () => {
      video.currentTime = time;
    };
    video.onseeked = () => resolve(video);
    video.onerror = () => resolve(null);
    video.src = src;
  });
}

async function compositeVideoLayers(
  project: Project,
  time: number,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  const videos = project.elements.filter((e) => e.type === "video" && e.visible);
  for (const el of videos) {
    const href = String(el.attrs.href ?? "");
    if (!href) continue;

    const trimIn = Number(el.attrs.trimIn ?? 0);
    const trimOut = Number(el.attrs.trimOut ?? el.attrs.sourceDuration ?? 0);
    const videoTime = getVideoTimeAtPlayhead(time, trimIn, trimOut);
    if (videoTime === null) continue;

    const video = await seekVideoFrame(href, videoTime);
    if (!video) continue;

    const x = Number(el.attrs.x ?? 0);
    const y = Number(el.attrs.y ?? 0);
    const w = Number(el.attrs.width ?? 200);
    const h = Number(el.attrs.height ?? 200);
    const objectFit = String(el.attrs.objectFit ?? "contain");

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw > 0 && vh > 0) {
      let dw = w;
      let dh = h;
      let dx = x;
      let dy = y;
      if (objectFit === "contain") {
        const scale = Math.min(w / vw, h / vh);
        dw = vw * scale;
        dh = vh * scale;
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
      } else if (objectFit === "cover") {
        const scale = Math.max(w / vw, h / vh);
        dw = vw * scale;
        dh = vh * scale;
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
      } else if (objectFit === "none") {
        dw = vw;
        dh = vh;
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
      }
      ctx.drawImage(video, dx, dy, dw, dh);
    }
    ctx.restore();
  }
}

async function renderFrameToImageData(
  project: Project,
  time: number,
  width: number,
  height: number
): Promise<ImageData> {
  const snapshotProject: Project = {
    ...project,
    elements: project.elements.map((e) =>
      e.type === "video" ? { ...e, visible: false } : e
    ),
  };
  const svg = renderProjectSnapshot(snapshotProject, time);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = project.canvas.background ?? "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    await compositeVideoLayers(project, time, ctx);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface RasterExportProgress {
  frame: number;
  total: number;
  phase: string;
}

/** Export animated GIF using frame-by-frame SVG snapshots */
export async function exportToGif(
  project: Project,
  fps = 15,
  onProgress?: (p: RasterExportProgress) => void
): Promise<Blob> {
  const totalFrames = Math.max(1, Math.ceil(project.duration * fps));
  const width = project.canvas.width;
  const height = project.canvas.height;
  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const t = Math.min(project.duration, i / fps);
    onProgress?.({ frame: i + 1, total: totalFrames, phase: "Rendering GIF frames" });

    const imageData = await renderFrameToImageData(project, t, width, height);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: Math.round(1000 / fps),
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

/** Export WebM video via MediaRecorder + canvas stream */
export async function exportToWebm(
  project: Project,
  fps = 30,
  onProgress?: (p: RasterExportProgress) => void
): Promise<Blob> {
  const width = project.canvas.width;
  const height = project.canvas.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = Math.max(1, Math.ceil(project.duration * fps));
  const frameDelay = 1000 / fps;

  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
    recorder.start();
  });

  for (let i = 0; i < totalFrames; i++) {
    const t = Math.min(project.duration, i / fps);
    onProgress?.({ frame: i + 1, total: totalFrames, phase: "Recording WebM" });
    const imageData = await renderFrameToImageData(project, t, width, height);
    ctx.putImageData(imageData, 0, 0);
    await new Promise((r) => setTimeout(r, frameDelay));
  }

  recorder.stop();
  return recording;
}

/** Export MP4 when browser supports it, otherwise WebM */
export async function exportToMp4(
  project: Project,
  fps = 30,
  onProgress?: (p: RasterExportProgress) => void
): Promise<{ blob: Blob; format: "mp4" | "webm" }> {
  const width = project.canvas.width;
  const height = project.canvas.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const mp4Mime = "video/mp4";
  const useMp4 = MediaRecorder.isTypeSupported(mp4Mime);
  const mimeType = useMp4
    ? mp4Mime
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const totalFrames = Math.max(1, Math.ceil(project.duration * fps));
  const frameDelay = 1000 / fps;

  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
    recorder.start();
  });

  for (let i = 0; i < totalFrames; i++) {
    const t = Math.min(project.duration, i / fps);
    onProgress?.({ frame: i + 1, total: totalFrames, phase: useMp4 ? "Recording MP4" : "Recording WebM (MP4 fallback)" });
    const imageData = await renderFrameToImageData(project, t, width, height);
    ctx.putImageData(imageData, 0, 0);
    await new Promise((r) => setTimeout(r, frameDelay));
  }

  recorder.stop();
  const blob = await recording;
  return { blob, format: useMp4 ? "mp4" : "webm" };
}
