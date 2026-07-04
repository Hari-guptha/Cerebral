const SVG_KEYWORDS = new Set(["none", "transparent", "currentColor"]);

export function isValidCssColor(color: string): boolean {
  const c = color.trim();
  if (!c) return false;
  if (SVG_KEYWORDS.has(c)) return true;
  if (typeof document === "undefined") return true;

  const el = document.createElement("span");
  el.style.color = "";
  el.style.color = c;
  return el.style.color !== "";
}

/** Normalize any CSS color to #rrggbb for the native color picker. */
export function toPickerHex(color: string): string | null {
  const c = color.trim();
  if (!c || SVG_KEYWORDS.has(c)) return null;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = c;
    const normalized = ctx.fillStyle;
    if (normalized.startsWith("#")) {
      if (normalized.length === 7) return normalized;
      if (normalized.length === 4) {
        const [, r, g, b] = normalized;
        return `#${r}${r}${g}${g}${b}${b}`;
      }
    }
    const rgb = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
      const hex = (n: string) => parseInt(n, 10).toString(16).padStart(2, "0");
      return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
    }
  } catch {
    return null;
  }
  return null;
}
