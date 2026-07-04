import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/server/prisma";
import { randomBytes } from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await _request.json().catch(() => ({}))) as { mode?: string; expiresInDays?: number };
    const mode = body.mode === "edit" ? "edit" : "view";
    const token = randomBytes(24).toString("hex");
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400000)
      : null;

    const prisma = getPrisma();
    const link = await prisma.shareLink.create({
      data: { token, projectId: id, mode, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({
      token: link.token,
      shareUrl: `${baseUrl}/share/${link.token}`,
      mode: link.mode,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("POST share", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ shareUrl: null, links: [], message: "Database offline" });
  }

  try {
    const prisma = getPrisma();
    const links = await prisma.shareLink.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        token: l.token,
        mode: l.mode,
        shareUrl: `${baseUrl}/share/${l.token}`,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET share", error);
    return NextResponse.json({ error: "Failed to list share links" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get("linkId");
  if (!linkId || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const prisma = getPrisma();
  await prisma.shareLink.deleteMany({ where: { id: linkId, projectId: id } });
  return NextResponse.json({ ok: true });
}
