const GEMINI_KEY_STORAGE = "cerebral_gemini_api_key";
const GEMINI_MODEL_STORAGE = "cerebral_gemini_model";

export const GEMINI_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (fast)" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (quality)" },
] as const;

export function getGeminiApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GEMINI_KEY_STORAGE);
}

export function setGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}

export function hasGeminiApiKey(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length > 10);
}

export function getGeminiModel(): string {
  if (typeof window === "undefined") return GEMINI_MODELS[0].id;
  return localStorage.getItem(GEMINI_MODEL_STORAGE) ?? GEMINI_MODELS[0].id;
}

export function setGeminiModel(model: string): void {
  localStorage.setItem(GEMINI_MODEL_STORAGE, model);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}${"•".repeat(12)}${key.slice(-4)}`;
}
