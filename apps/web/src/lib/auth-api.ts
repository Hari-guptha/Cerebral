export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export async function fetchSession(): Promise<{
  user: AuthUser | null;
  workspace: WorkspaceInfo | null;
  database: boolean;
}> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return { user: null, workspace: null, database: false };
    return res.json();
  } catch {
    return { user: null, workspace: null, database: false };
  }
}

export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data as { user: AuthUser; workspace: WorkspaceInfo | null };
}

export async function register(
  email: string,
  password: string,
  name: string,
  workspaceName?: string
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, workspaceName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data as { user: AuthUser; workspace: WorkspaceInfo };
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function listWorkspaces(): Promise<WorkspaceInfo[]> {
  const res = await fetch("/api/workspaces");
  if (!res.ok) return [];
  const data = await res.json();
  return data.workspaces ?? [];
}

export async function createWorkspace(name: string): Promise<WorkspaceInfo | null> {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.workspace ?? null;
}
