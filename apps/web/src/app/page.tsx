import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Layers, Clock, Download, Sparkles, Wand2, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Cerebral</span>
          </div>
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="sm">AI Settings</Button>
            </Link>
            <Link href="/editor">
              <Button>Open Studio</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-20 text-center">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
            AI-Powered SVG Motion Studio
          </p>
          <h1 className="mb-6 text-5xl font-light tracking-tight md:text-6xl">
            Think it.
            <br />
            <span className="font-semibold">Animate it.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-neutral-500">
            Cerebral combines professional keyframe animation with Gemini AI.
            Describe motion in chat, drag elements on canvas, and export to
            SMIL, CSS, Lottie, React, and more.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/editor">
              <Button className="h-12 px-10 text-sm uppercase tracking-wider">
                Open Studio
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="h-12 px-10 text-sm uppercase tracking-wider">
                Connect Gemini
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-16 grid gap-px border border-neutral-800 bg-neutral-800 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, title: "Gemini AI", desc: "Describe animations in plain English. AI generates keyframes on your timeline instantly." },
            { icon: Wand2, title: "Animation Presets", desc: "Fade, slide, bounce, spin, pulse — one-click pro motion on any layer." },
            { icon: Layers, title: "Layer Studio", desc: "Multi-select, group, reorder, lock. Drag elements freely on canvas with transform handles." },
            { icon: Clock, title: "Pro Timeline", desc: "Frame-accurate snapping, zoom, per-property tracks, easing editor, markers, and work areas." },
            { icon: Download, title: "Export Suite", desc: "SMIL, CSS, JS player, Lottie JSON, React TSX, and native .cerebral project files." },
            { icon: Zap, title: "Version Control", desc: "Auto-save to PostgreSQL + IndexedDB. Named snapshots while you animate." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-black p-8">
              <Icon className="mb-4 h-5 w-5 text-white" strokeWidth={1.5} />
              <h3 className="mb-2 text-sm font-medium">{title}</h3>
              <p className="text-xs leading-relaxed text-neutral-500">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-neutral-400" />
          <h2 className="mb-2 text-lg font-light">Competitive edge</h2>
          <p className="mx-auto max-w-lg text-xs text-neutral-500">
            Unlike SVGator or Lottie Creator, Cerebral is AI-first: chat-to-animate,
            open-source friendly exports, self-hosted database, and a full keyframe
            timeline — no watermarks, no vendor lock-in.
          </p>
        </div>
      </main>
    </div>
  );
}
