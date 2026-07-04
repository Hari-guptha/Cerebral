import { NextResponse } from "next/server";
import { buildAiContext } from "@svg-animator/engine";
import type { AiAnimationPlan } from "@svg-animator/engine";
import type { Project } from "@svg-animator/types";

const SYSTEM_PROMPT = `You are Cerebral AI — an expert SVG motion designer. Given a project context (schemaVersion 2) and user prompt, output ONLY valid JSON (no markdown) matching this schema:

{
  "duration": number (optional, seconds),
  "message": string (brief description of what you created),
  "animations": [
    {
      "elementId": string (prefer exact id from context),
      "elementName": string (fallback match by name),
      "tracks": [
        {
          "property": "x"|"y"|"rotation"|"scaleX"|"scaleY"|"opacity"|"fill"|"stroke"|"strokeWidth"|"strokeDashoffset"|"pathD"|"pathProgress",
          "keyframes": [
            { "time": number, "value": number|string, "easing": "linear"|"easeIn"|"easeOut"|"easeInOut"|"spring"|"bounce"|"anticipate", "hold": boolean }
          ]
        }
      ]
    }
  ]
}

Context includes: elements, existing tracks with keyframes, state machine states/transitions, timeline markers, work area, motion paths (motionPathId), and hints.

Rules:
- Use element ids from context when possible
- If user says "selected", only animate selectedIds
- pathProgress is 0–1 along assigned motionPathId
- For motion along a path, animate pathProgress (not x/y) when motionPathId is set
- If user says "all" or doesn't specify, animate visible non-locked elements
- Times are in seconds, within project duration (respect workArea when user asks for loop section)
- Create smooth professional motion with appropriate easing
- For stagger, offset start times per element (0.1-0.15s apart)
- opacity values 0-1, rotation in degrees
- Always include at least 2 keyframes per animated property`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt: string;
      apiKey: string;
      model?: string;
      project: Project;
      selectedIds: string[];
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!body.apiKey?.trim()) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }
    if (!body.project) {
      return NextResponse.json({ error: "Project context is required" }, { status: 400 });
    }

    const context = buildAiContext(body.project, body.selectedIds ?? []);
    const model = body.model ?? "gemini-2.0-flash";

    const userMessage = `Project context:\n${JSON.stringify(context, null, 2)}\n\nUser request: ${body.prompt}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let message = "Gemini API error";
      try {
        const errJson = JSON.parse(errText);
        message = errJson.error?.message ?? message;
      } catch {
        message = errText.slice(0, 200);
      }
      return NextResponse.json({ error: message }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const text =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let plan: AiAnimationPlan;
    try {
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      plan = JSON.parse(cleaned) as AiAnimationPlan;
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Try rephrasing your prompt.", raw: text },
        { status: 422 }
      );
    }

    if (!plan.animations || !Array.isArray(plan.animations)) {
      plan = { ...plan, animations: [] };
    }

    return NextResponse.json({ plan, raw: text });
  } catch (error) {
    console.error("POST /api/ai/animate", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
