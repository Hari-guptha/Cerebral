"use client";

import { useEffect, useRef } from "react";
import type { ElementNode } from "@svg-animator/types";
import { getVideoTimeAtPlayhead } from "@/lib/media-import";

export interface VideoElementProps {
  element: ElementNode;
  opacity: number;
  transform?: string;
  currentTime: number;
  isPlaying: boolean;
  isSelected: boolean;
  isDeepHover: boolean;
  interactive: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function VideoElement({
  element,
  opacity,
  transform,
  currentTime,
  isPlaying,
  isSelected,
  isDeepHover,
  interactive,
  onMouseDown,
  onClick,
}: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const href = String(element.attrs.href ?? "");
  const x = Number(element.attrs.x ?? 0);
  const y = Number(element.attrs.y ?? 0);
  const width = Number(element.attrs.width ?? 200);
  const height = Number(element.attrs.height ?? 200);
  const objectFit = String(element.attrs.objectFit ?? "contain");
  const trimIn = Number(element.attrs.trimIn ?? 0);
  const trimOut = Number(element.attrs.trimOut ?? element.attrs.sourceDuration ?? 0);
  const cropX = Number(element.attrs.cropX ?? 0);
  const cropY = Number(element.attrs.cropY ?? 0);
  const cropWidth = Number(element.attrs.cropWidth ?? 1);
  const cropHeight = Number(element.attrs.cropHeight ?? 1);
  const playbackRate = Number(element.attrs.playbackRate ?? 1);
  const muted = Number(element.attrs.muted ?? 1) === 1;

  const targetTime = getVideoTimeAtPlayhead(currentTime, trimIn, trimOut);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !href) return;
    video.playbackRate = playbackRate;
    video.muted = muted;
  }, [href, playbackRate, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || targetTime === null) return;

    const sync = () => {
      if (Math.abs(video.currentTime - targetTime) > 0.05) {
        video.currentTime = targetTime;
      }
      if (isPlaying) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    if (video.readyState >= 1) {
      sync();
    } else {
      video.addEventListener("loadedmetadata", sync, { once: true });
      return () => video.removeEventListener("loadedmetadata", sync);
    }
  }, [targetTime, isPlaying, href]);

  if (!href) return null;

  const cropStyle =
    cropWidth < 1 || cropHeight < 1 || cropX > 0 || cropY > 0
      ? {
          objectPosition: `${-cropX * 100}% ${-cropY * 100}%`,
          width: `${100 / cropWidth}%`,
          height: `${100 / cropHeight}%`,
        }
      : {};

  const outline =
    isSelected
      ? "outline outline-1 outline-white outline-offset-2"
      : isDeepHover
        ? "outline outline-1 outline-sky-400 outline-offset-2"
        : "";

  return (
    <g
      opacity={opacity}
      transform={transform}
      data-element-id={element.id}
      onMouseDown={interactive ? onMouseDown : undefined}
      onClick={interactive ? onClick : undefined}
      style={interactive ? { cursor: element.locked ? "not-allowed" : "move" } : undefined}
    >
      <foreignObject x={x} y={y} width={width} height={height} className={outline}>
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            background: "#000",
            pointerEvents: interactive ? "auto" : "none",
          }}
        >
          <video
            ref={videoRef}
            src={href}
            style={{
              width: "100%",
              height: "100%",
              objectFit: objectFit as React.CSSProperties["objectFit"],
              display: "block",
              ...cropStyle,
            }}
            muted={muted}
            playsInline
            preload="auto"
          />
        </div>
      </foreignObject>
    </g>
  );
}
