import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadBlob(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export function timeToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export function formatFrame(seconds: number, fps: number): string {
  return `F${timeToFrame(seconds, fps)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert SVG kebab-case attributes to React camelCase DOM props */
export function toReactSvgAttrs(
  attrs: Record<string, string | number | unknown>
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    const reactKey = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[reactKey] = value as string | number;
  }
  return result;
}
