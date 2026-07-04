"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useEditorStore } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import {
  requestAiAnimation,
  AI_PROMPT_SUGGESTIONS,
  type AiChatMessage,
} from "@/lib/ai-api";
import { hasGeminiApiKey } from "@/lib/gemini-settings";
import { Brain, Send, Sparkles, Settings, Loader2, Wand2, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { createId } from "@svg-animator/types";

export function AiChatPanel() {
  const { project, selectedIds, applyAiPlan } = useEditorStore();
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Describe how you want to animate. I'll generate keyframes on your timeline. Try: \"fade in all elements with stagger\" or select a layer and say \"bounce it into view\".",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const configured = hasGeminiApiKey();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendPrompt = async (text: string) => {
    if (!text.trim() || !project || loading) return;

    const userMsg: AiChatMessage = {
      id: createId(),
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const result = await requestAiAnimation(text.trim(), project, selectedIds);

    if (result.error) {
      setMessages((m) => [
        ...m,
        {
          id: createId(),
          role: "assistant" as const,
          content: result.error ?? "Unknown error",
          timestamp: Date.now(),
        },
      ]);
    } else {
      applyAiPlan(result.plan);
      const trackCount = result.plan.animations.reduce((n, a) => n + a.tracks.length, 0);
      setMessages((m) => [
        ...m,
        {
          id: createId(),
          role: "assistant",
          content: result.plan.message ?? `Applied ${trackCount} animation track${trackCount !== 1 ? "s" : ""} to your timeline.`,
          plan: result.plan,
          timestamp: Date.now(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-white" />
          <span className="text-xs font-semibold uppercase tracking-widest">Cerebral AI</span>
        </div>
        <Link href="/settings" title="AI Settings">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {!configured && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
          <p className="mb-2 text-xs text-neutral-400">
            Add your Gemini API key to enable AI animation.
          </p>
          <Link href="/settings">
            <Button size="sm" variant="outline" className="w-full text-xs">
              <Key className="mr-1 h-3 w-3" /> Configure API Key
            </Button>
          </Link>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg px-3 py-2 text-xs leading-relaxed",
              msg.role === "user"
                ? "ml-6 bg-white text-black"
                : "mr-4 border border-neutral-800 bg-neutral-950 text-neutral-300"
            )}
          >
            {msg.role === "assistant" && msg.plan && (
              <Wand2 className="mb-1 inline h-3 w-3 text-neutral-500" />
            )}{" "}
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating animation...
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {AI_PROMPT_SUGGESTIONS.slice(0, 3).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendPrompt(s)}
              disabled={!configured || !project || loading}
              className="rounded border border-neutral-800 px-2 py-0.5 text-[9px] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-40"
            >
              <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
              {s.length > 40 ? `${s.slice(0, 40)}…` : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendPrompt(input);
              }
            }}
            placeholder={configured ? "Describe your animation..." : "Add API key in Settings first"}
            disabled={!configured || !project || loading}
            rows={2}
            className="flex-1 resize-none rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={() => sendPrompt(input)}
            disabled={!configured || !project || !input.trim() || loading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
