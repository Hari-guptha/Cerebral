"use client";

import { useEffect, useRef } from "react";
import { CerebralPlayer } from "@svg-animator/player";
import type { Project } from "@svg-animator/types";

interface CerebralPlayerEmbedProps {
  project: Project;
  autoplay?: boolean;
  loop?: boolean;
  interactive?: boolean;
  className?: string;
}

export function CerebralPlayerEmbed({
  project,
  autoplay = true,
  loop = true,
  interactive = true,
  className,
}: CerebralPlayerEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<CerebralPlayer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    playerRef.current?.destroy();
    playerRef.current = new CerebralPlayer({
      container,
      project,
      autoplay,
      loop,
      interactive,
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [project, autoplay, loop, interactive]);

  return (
    <div
      ref={containerRef}
      className={className ?? "flex h-full w-full items-center justify-center bg-black p-8"}
    />
  );
}
