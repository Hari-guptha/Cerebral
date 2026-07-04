"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { useEditorStore } from "@/store/editor-store";
import { heartbeatPresence, getSessionId } from "@/lib/collab-api";
import { isDatabaseOnline } from "@/lib/project-api";
import { pullYjsUpdates, pushYjsUpdate, toBase64 } from "@/lib/yjs-api";
import {
  applyUpdate,
  createProjectDoc,
  encodeUpdate,
  readProjectFromDoc,
  writeProjectToDoc,
  YJS_ORIGIN_LOCAL,
} from "@/lib/yjs-project";

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Presence heartbeat + Yjs HTTP sync for open projects. */
export function useCollaboration() {
  const project = useEditorStore((s) => s.project);
  const collabEnabled = useEditorStore((s) => s.collabEnabled);

  const docRef = useRef<Y.Doc | null>(null);
  const lastPullRef = useRef<string | undefined>(undefined);
  const lastPushedRef = useRef<string>("");
  const syncingRef = useRef(false);
  const sessionRef = useRef(getSessionId());
  const lastLocalJsonRef = useRef<string>("");

  useEffect(() => {
    if (!project?.id) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const online = await isDatabaseOnline();
      if (!online || cancelled) return;
      await heartbeatPresence(project.id);
    };

    void tick();
    const interval = setInterval(() => void tick(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id || !collabEnabled) {
      docRef.current = null;
      return;
    }

    let cancelled = false;
    const doc = createProjectDoc(project);
    docRef.current = doc;
    lastPullRef.current = undefined;
    lastPushedRef.current = "";
    lastLocalJsonRef.current = JSON.stringify(project);
    sessionRef.current = getSessionId();

    const pushLocal = async () => {
      if (cancelled || syncingRef.current || !docRef.current) return;
      const update = encodeUpdate(docRef.current);
      const b64 = toBase64(update);
      if (b64 === lastPushedRef.current) return;
      const ok = await pushYjsUpdate(project.id, b64);
      if (ok) lastPushedRef.current = b64;
    };

    const pullRemote = async () => {
      if (cancelled || !docRef.current) return;
      const online = await isDatabaseOnline();
      if (!online) return;

      syncingRef.current = true;
      try {
        const updates = await pullYjsUpdates(project.id, lastPullRef.current);
        let applied = false;
        for (const row of updates) {
          if (row.sessionId === sessionRef.current) {
            lastPullRef.current = row.createdAt;
            continue;
          }
          applyUpdate(docRef.current, fromBase64(row.update));
          lastPullRef.current = row.createdAt;
          applied = true;
        }

        if (applied) {
          const remote = readProjectFromDoc(docRef.current);
          if (remote) {
            lastLocalJsonRef.current = JSON.stringify(remote);
            useEditorStore.getState().applyRemoteProject(remote);
          }
        }
      } finally {
        syncingRef.current = false;
      }
    };

    void pullRemote();
    const poll = setInterval(() => void pullRemote(), 3000);

    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useEditorStore.subscribe((state) => {
      if (!state.project || state.project.id !== project.id || syncingRef.current) return;
      const json = JSON.stringify(state.project);
      if (json === lastLocalJsonRef.current) return;
      lastLocalJsonRef.current = json;
      if (!docRef.current) return;
      writeProjectToDoc(docRef.current, state.project, YJS_ORIGIN_LOCAL);
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => void pushLocal(), 400);
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(pushTimer);
      unsubStore();
      docRef.current = null;
    };
  }, [project?.id, collabEnabled]);
}
