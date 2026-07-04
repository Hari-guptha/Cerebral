import type { ObjectFitMode, Project } from "@svg-animator/types";
import { createMediaAssetId, storeMediaAsset } from "./media-assets";

export type MediaImportMode = "add-layer" | "replace-project" | "merge-svg";

export interface MediaImportOptions {
  objectFit?: ObjectFitMode;
  trimIn?: number;
  trimOut?: number;
  /** Scale imported content to fit canvas bounds. */
  fitToCanvas?: boolean;
  /** Center on canvas when fitToCanvas is true. */
  centerOnCanvas?: boolean;
}

export interface ImageProbeResult {
  width: number;
  height: number;
  dataUrl: string;
}

export interface VideoProbeResult {
  width: number;
  height: number;
  duration: number;
  objectUrl: string;
  assetId: string;
}

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
]);

export function isImageFile(file: File): boolean {
  if (IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
}

export function isVideoFile(file: File): boolean {
  if (VIDEO_TYPES.has(file.type)) return true;
  return /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);
}

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

export function isProjectFile(file: File): boolean {
  return /\.svganim$/i.test(file.name) || file.type === "application/json";
}

export function getMediaFileKind(file: File): "svg" | "image" | "video" | "project" | "unknown" {
  if (isProjectFile(file)) return "project";
  if (isSvgFile(file)) return "svg";
  if (isVideoFile(file)) return "video";
  if (isImageFile(file)) return "image";
  return "unknown";
}

export function computeFitRect(
  sourceW: number,
  sourceH: number,
  frameW: number,
  frameH: number,
  objectFit: ObjectFitMode
): { x: number; y: number; width: number; height: number } {
  if (objectFit === "fill") {
    return { x: 0, y: 0, width: frameW, height: frameH };
  }
  if (objectFit === "none") {
    const x = (frameW - sourceW) / 2;
    const y = (frameH - sourceH) / 2;
    return { x, y, width: sourceW, height: sourceH };
  }

  const scale =
    objectFit === "cover"
      ? Math.max(frameW / sourceW, frameH / sourceH)
      : Math.min(frameW / sourceW, frameH / sourceH);

  const width = sourceW * scale;
  const height = sourceH * scale;
  return {
    x: (frameW - width) / 2,
    y: (frameH - height) / 2,
    width,
    height,
  };
}

export function computeCanvasPlacement(
  sourceW: number,
  sourceH: number,
  canvas: Project["canvas"],
  options: MediaImportOptions
): { x: number; y: number; width: number; height: number } {
  const objectFit = options.objectFit ?? "contain";
  if (options.fitToCanvas !== false) {
    return computeFitRect(sourceW, sourceH, canvas.width, canvas.height, objectFit);
  }
  const maxW = canvas.width * 0.8;
  const maxH = canvas.height * 0.8;
  const fit = computeFitRect(sourceW, sourceH, maxW, maxH, "contain");
  if (options.centerOnCanvas !== false) {
    fit.x += (canvas.width - fit.width) / 2;
    fit.y += (canvas.height - fit.height) / 2;
  }
  return fit;
}

export async function probeImageFile(file: File): Promise<ImageProbeResult> {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    const vb = svg?.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
    const width = vb?.[2] ?? parseFloat(svg?.getAttribute("width") ?? "512");
    const height = vb?.[3] ?? parseFloat(svg?.getAttribute("height") ?? "512");
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
    return { width, height, dataUrl };
  }

  const dataUrl = await readFileAsDataUrl(file);
  const dims = await loadImageDimensions(dataUrl);
  return { width: dims.width, height: dims.height, dataUrl };
}

export async function probeVideoFile(file: File): Promise<VideoProbeResult> {
  const assetId = createMediaAssetId();
  await storeMediaAsset(file, assetId);
  const objectUrl = URL.createObjectURL(file);

  const meta = await loadVideoMetadata(objectUrl);
  return {
    width: meta.videoWidth,
    height: meta.videoHeight,
    duration: meta.duration,
    objectUrl,
    assetId,
  };
}

export function buildImageAttrs(
  href: string,
  sourceW: number,
  sourceH: number,
  canvas: Project["canvas"],
  options: MediaImportOptions = {}
): Record<string, string | number> {
  const placement = computeCanvasPlacement(sourceW, sourceH, canvas, options);
  return {
    href,
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    objectFit: options.objectFit ?? "contain",
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
  };
}

export function buildVideoAttrs(
  href: string,
  assetId: string,
  sourceW: number,
  sourceH: number,
  duration: number,
  canvas: Project["canvas"],
  options: MediaImportOptions = {}
): Record<string, string | number> {
  const placement = computeCanvasPlacement(sourceW, sourceH, canvas, options);
  const trimIn = options.trimIn ?? 0;
  const trimOut = options.trimOut ?? duration;
  return {
    href,
    assetId,
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    objectFit: options.objectFit ?? "contain",
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
    trimIn,
    trimOut,
    sourceDuration: duration,
    muted: 1,
    playbackRate: 1,
  };
}

export function getVideoTimeAtPlayhead(
  currentTime: number,
  trimIn: number,
  trimOut: number
): number | null {
  const clipDuration = trimOut - trimIn;
  if (clipDuration <= 0) return null;
  if (currentTime < 0 || currentTime > clipDuration) return null;
  return trimIn + currentTime;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function loadVideoMetadata(src: string): Promise<{
  videoWidth: number;
  videoHeight: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    };
    video.onerror = () => reject(new Error("Failed to load video metadata"));
    video.src = src;
  });
}
