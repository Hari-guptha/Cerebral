export interface ShareLinkInfo {
  id: string;
  token: string;
  mode: string;
  shareUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export async function createShareLink(
  projectId: string,
  mode: "view" | "edit" = "view"
): Promise<ShareLinkInfo | null> {
  try {
    const res = await fetch(`/api/projects/${projectId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.token,
      token: data.token,
      mode: data.mode,
      shareUrl: data.shareUrl,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function listShareLinks(projectId: string): Promise<ShareLinkInfo[]> {
  try {
    const res = await fetch(`/api/projects/${projectId}/share`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.links ?? [];
  } catch {
    return [];
  }
}

export async function revokeShareLink(projectId: string, linkId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${projectId}/share?linkId=${linkId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadSharedProject(token: string) {
  try {
    const res = await fetch(`/api/share/${token}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const SESSION_KEY = "cerebral_session_id";
const NAME_KEY = "cerebral_user_name";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem(NAME_KEY) ?? "Anonymous";
}

export function setUserName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export async function heartbeatPresence(projectId: string): Promise<void> {
  try {
    await fetch(`/api/projects/${projectId}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        userName: getUserName(),
      }),
    });
  } catch { /* offline */ }
}
