"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadSharedProject } from "@/lib/collab-api";
import type { Project } from "@svg-animator/types";
import { CerebralPlayerEmbed } from "@/components/player/cerebral-player-embed";
import { Button } from "@/components/ui/button";
import { Brain, Download } from "lucide-react";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("view");
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    loadSharedProject(token).then((data) => {
      if (!data?.project) {
        setError(data?.error ?? "Project not found");
        return;
      }
      setMode(data.mode);
      setProject(data.project as Project);
    });
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="text-sm text-neutral-400">{error}</p>
        <Link href="/" className="mt-4"><Button variant="outline">Home</Button></Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-neutral-500">
        Loading shared project...
      </div>
    );
  }

  const loop = project.settings.loop === "loop";

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <header className="flex h-11 items-center justify-between border-b border-neutral-800 px-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Cerebral</span>
          <span className="text-neutral-600">·</span>
          <span className="text-sm">{project.name}</span>
          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[9px] uppercase text-neutral-500">{mode}</span>
        </div>
        {mode === "edit" ? (
          <Link href={`/editor`}>
            <Button size="sm" onClick={() => {
              sessionStorage.setItem("cerebral_import_project", JSON.stringify(project));
            }}>
              Open in Editor
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <Download className="mr-1 h-3.5 w-3.5" /> View only
          </Button>
        )}
      </header>
      <main className="flex-1 overflow-hidden">
        <CerebralPlayerEmbed
          project={project}
          autoplay
          loop={loop}
          interactive={Boolean(project.stateMachine)}
        />
      </main>
    </div>
  );
}
