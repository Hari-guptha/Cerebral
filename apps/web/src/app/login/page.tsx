"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, workspaceName || undefined);
      }
      router.push("/editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <div className="mb-8 flex items-center gap-2">
        <Brain className="h-6 w-6" />
        <span className="text-sm font-semibold uppercase tracking-widest">Cerebral</span>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded border border-neutral-800 bg-neutral-950 p-6">
        <h1 className="text-lg font-medium">{mode === "login" ? "Sign in" : "Create account"}</h1>

        {mode === "register" && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-black" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Workspace name</Label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Studio"
                className="bg-black"
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-neutral-500">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-black" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-neutral-500">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-black"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign in" : "Register"}
        </Button>

        <button
          type="button"
          className="w-full text-center text-xs text-neutral-500 hover:text-white"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>

      <Link href="/editor" className="mt-6 text-xs text-neutral-600 hover:text-neutral-400">
        Continue without account →
      </Link>
    </div>
  );
}
