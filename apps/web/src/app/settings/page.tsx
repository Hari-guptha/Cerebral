"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getGeminiApiKey,
  setGeminiApiKey,
  clearGeminiApiKey,
  getGeminiModel,
  setGeminiModel,
  maskApiKey,
  GEMINI_MODELS,
  hasGeminiApiKey,
} from "@/lib/gemini-settings";
import { Brain, Key, ExternalLink, Check, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [model, setModel] = useState(getGeminiModel);
  const configured = hasGeminiApiKey();
  const existingKey = getGeminiApiKey();

  const handleSave = () => {
    if (apiKey.trim()) {
      setGeminiApiKey(apiKey);
      setApiKey("");
    }
    setGeminiModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Cerebral</span>
          </Link>
          <Link href="/editor">
            <Button variant="outline" size="sm">Open Editor</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="mb-2 text-2xl font-light">AI Settings</h1>
          <p className="text-sm text-neutral-500">
            Connect Google Gemini to animate with natural language. Your API key stays in your browser — never stored on our servers.
          </p>
        </div>

        <div className="space-y-8 rounded-lg border border-neutral-800 bg-neutral-950 p-8">
          <div className="flex items-start gap-4 rounded border border-neutral-800 bg-black p-4">
            <Key className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
            <div className="flex-1">
              <h2 className="mb-1 text-sm font-medium">Gemini API Key</h2>
              <p className="mb-4 text-xs text-neutral-500">
                Get a free key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white underline"
                >
                  Google AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              </p>

              {configured && existingKey && (
                <p className="mb-3 font-mono text-xs text-neutral-400">
                  Current: {maskApiKey(existingKey)}
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="apiKey" className="text-xs text-neutral-500">
                    {configured ? "Replace API key" : "API key"}
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1 font-mono text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="text-xs text-neutral-500">Model</Label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-xs text-white"
                  >
                    {GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={!apiKey.trim() && model === getGeminiModel()}>
                    {saved ? <><Check className="mr-1 h-4 w-4" /> Saved</> : "Save"}
                  </Button>
                  {configured && (
                    <Button
                      variant="outline"
                      onClick={() => { clearGeminiApiKey(); setApiKey(""); }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Remove key
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium">What you can do with AI</h2>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>• Describe animations in plain English — &quot;fade in all icons with stagger&quot;</li>
              <li>• Target selected elements — &quot;bounce the logo into view&quot;</li>
              <li>• Complex motion — &quot;spin 360° while scaling up with spring easing&quot;</li>
              <li>• Iterate in chat — refine animations with follow-up prompts</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
