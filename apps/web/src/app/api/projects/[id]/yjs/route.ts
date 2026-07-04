import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/server/prisma";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ updates: [], database: false });
  }

  const { id: projectId } = await params;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  const prisma = getPrisma();
  const rows = await prisma.collabUpdate.findMany({
    where: {
      projectId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, update: true, sessionId: true, createdAt: true },
  });

  return NextResponse.json({
    updates: rows.map((r) => ({
      id: r.id,
      update: toBase64(new Uint8Array(r.update)),
      sessionId: r.sessionId,
      createdAt: r.createdAt.toISOString(),
    })),
    database: true,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id: projectId } = await params;
  const body = (await request.json()) as { update?: string; sessionId?: string };

  if (!body.update || !body.sessionId) {
    return NextResponse.json({ error: "update and sessionId required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const row = await prisma.collabUpdate.create({
    data: {
      projectId,
      sessionId: body.sessionId,
      update: Buffer.from(fromBase64(body.update)),
    },
  });

  // Prune old updates (keep last 500)
  const old = await prisma.collabUpdate.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    skip: 500,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.collabUpdate.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  return NextResponse.json({ id: row.id, createdAt: row.createdAt.toISOString() });
}
