"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createShareLink, listShareLinks, revokeShareLink, setUserName, getUserName } from "@/lib/collab-api";
import { Link2, Copy, Trash2, Users, Check } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const { project, collabEnabled, setCollabEnabled } = useEditorStore();
  const [links, setLinks] = useState<Awaited<ReturnType<typeof listShareLinks>>>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [viewers, setViewers] = useState<{ userName: string; color: string }[]>([]);
  const [displayName, setDisplayName] = useState(getUserName());

  const refresh = async () => {
    if (!project) return;
    setLoading(true);
    const [linkList, presence] = await Promise.all([
      listShareLinks(project.id),
      fetch(`/api/projects/${project.id}/presence`).then((r) => r.json()).catch(() => ({ viewers: [] })),
    ]);
    setLinks(linkList);
    setViewers(presence.viewers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && project) refresh();
  }, [open, project?.id]);

  const handleCreate = async (mode: "view" | "edit") => {
    if (!project) return;
    const link = await createShareLink(project.id, mode);
    if (link) await refresh();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Share & Collaborate" className="max-w-md">
      <div className="space-y-5">
        <div className="rounded border border-neutral-800 p-3 space-y-2">
          <label className="flex items-center justify-between text-xs text-neutral-400">
            <span>Live sync (Yjs)</span>
            <input
              type="checkbox"
              checked={collabEnabled}
              onChange={(e) => setCollabEnabled(e.target.checked)}
            />
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-neutral-800 bg-black px-2 py-1 text-xs"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
            <Button size="sm" variant="outline" onClick={() => setUserName(displayName)}>
              Save
            </Button>
          </div>
        </div>
        {viewers.length > 0 && (
          <div className="rounded border border-neutral-800 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
              <Users className="h-3.5 w-3.5" /> Active now ({viewers.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {viewers.map((v, i) => (
                <span key={i} className="flex items-center gap-1 rounded bg-neutral-900 px-2 py-1 text-[10px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
                  {v.userName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => handleCreate("view")} disabled={loading}>
            <Link2 className="mr-1 h-3.5 w-3.5" /> View link
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCreate("edit")} disabled={loading}>
            Edit link
          </Button>
        </div>

        <div className="max-h-48 space-y-2 overflow-auto">
          {links.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-600">No share links yet</p>
          ) : (
            links.map((link) => (
              <div key={link.id} className="flex items-center gap-2 rounded border border-neutral-800 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-neutral-400">{link.shareUrl}</p>
                  <p className="text-[9px] uppercase text-neutral-600">{link.mode} · {link.createdAt.slice(0, 10)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyUrl(link.shareUrl)}>
                  {copied === link.shareUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                  await revokeShareLink(project.id, link.id);
                  await refresh();
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
