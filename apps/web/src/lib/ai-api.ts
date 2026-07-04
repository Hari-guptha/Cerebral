import type { Project } from "@svg-animator/types";
import type { AiAnimationPlan } from "@svg-animator/engine";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini-settings";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  plan?: AiAnimationPlan;
  timestamp: number;
}

export interface AiAnimateResponse {
  plan: AiAnimationPlan;
  raw?: string;
  error?: string;
}

export async function requestAiAnimation(
  prompt: string,
  project: Project,
  selectedIds: string[]
): Promise<AiAnimateResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { plan: { animations: [] }, error: "Add your Gemini API key in Settings" };
  }

  const res = await fetch("/api/ai/animate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      apiKey,
      model: getGeminiModel(),
      project,
      selectedIds,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { plan: { animations: [] }, error: data.error ?? "AI request failed" };
  }

  return data as AiAnimateResponse;
}

export const AI_PROMPT_SUGGESTIONS = [
  "Fade in all elements with a stagger from left to right",
  "Bounce the selected element into view",
  "Create a looping float animation on the logo",
  "Spin the icon 360° over 2 seconds with ease-in-out",
  "Slide everything up from below with fade",
  "Pulse the selected shape twice then settle",
  "Animate opacity from 0 to 1 over the first second for all layers",
  "Make the circle scale from 0 to full size with a spring bounce",
];
