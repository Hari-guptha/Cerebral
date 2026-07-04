import { getSessionId } from "@/lib/collab-api";

export async function pushYjsUpdate(projectId: string, updateBase64: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${projectId}/yjs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update: updateBase64, sessionId: getSessionId() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullYjsUpdates(
  projectId: string,
  after?: string
): Promise<{ id: string; update: string; sessionId: string; createdAt: string }[]> {
  try {
    const qs = after ? `?after=${encodeURIComponent(after)}` : "";
    const res = await fetch(`/api/projects/${projectId}/yjs${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.updates ?? [];
  } catch {
    return [];
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export { toBase64 };
