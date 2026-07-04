"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cerebral_editor_layout";

export interface EditorLayout {
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
}

const DEFAULTS: EditorLayout = {
  leftWidth: 240,
  rightWidth: 300,
  timelineHeight: 300,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadLayout(): EditorLayout {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<EditorLayout>;
    return {
      leftWidth: clamp(parsed.leftWidth ?? DEFAULTS.leftWidth, 160, 520),
      rightWidth: clamp(parsed.rightWidth ?? DEFAULTS.rightWidth, 200, 560),
      timelineHeight: clamp(parsed.timelineHeight ?? DEFAULTS.timelineHeight, 140, 640),
    };
  } catch {
    return DEFAULTS;
  }
}

function saveLayout(layout: EditorLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function useEditorLayout() {
  const [layout, setLayout] = useState<EditorLayout>(DEFAULTS);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const resizeLeft = useCallback((delta: number) => {
    setLayout((prev) => {
      const next = { ...prev, leftWidth: clamp(prev.leftWidth + delta, 160, 520) };
      saveLayout(next);
      return next;
    });
  }, []);

  const resizeRight = useCallback((delta: number) => {
    setLayout((prev) => {
      const next = { ...prev, rightWidth: clamp(prev.rightWidth - delta, 200, 560) };
      saveLayout(next);
      return next;
    });
  }, []);

  const resizeTimeline = useCallback((delta: number) => {
    setLayout((prev) => {
      const next = { ...prev, timelineHeight: clamp(prev.timelineHeight - delta, 140, 640) };
      saveLayout(next);
      return next;
    });
  }, []);

  return { layout, resizeLeft, resizeRight, resizeTimeline };
}
