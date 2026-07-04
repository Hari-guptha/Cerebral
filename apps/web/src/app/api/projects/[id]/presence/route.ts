import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/server/prisma";
import { hasPresenceModel, isPrismaConnectionError } from "@/lib/server/db-capabilities";

const PRESENCE_TTL_MS = 60_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !hasPresenceModel()) {
    return NextResponse.json({ viewers: [], database: false });
  }

  try {
    const prisma = getPrisma();
    const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
    const rows = await prisma.projectPresence.findMany({
      where: { projectId: id, lastSeen: { gte: cutoff } },
      orderBy: { lastSeen: "desc" },
    });

    return NextResponse.json({
      viewers: rows.map((r) => ({
        sessionId: r.sessionId,
        userName: r.userName,
        color: r.color,
        lastSeen: r.lastSeen.toISOString(),
      })),
      database: true,
    });
  } catch (error) {
    if (!isPrismaConnectionError(error)) console.error("GET presence", error);
    return NextResponse.json({ viewers: [], database: false }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !hasPresenceModel()) {
    return NextResponse.json({ ok: false, database: false });
  }

  try {
    const body = (await request.json()) as {
      sessionId: string;
      userName?: string;
      color?: string;
    };

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const colors = ["#ffffff", "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa"];
    const color = body.color ?? colors[body.sessionId.charCodeAt(0) % colors.length];

    const prisma = getPrisma();
    await prisma.projectPresence.upsert({
      where: {
        projectId_sessionId: { projectId: id, sessionId: body.sessionId },
      },
      create: {
        projectId: id,
        sessionId: body.sessionId,
        userName: body.userName ?? "Anonymous",
        color,
      },
      update: {
        userName: body.userName ?? "Anonymous",
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ ok: true, database: true });
  } catch (error) {
    if (!isPrismaConnectionError(error)) console.error("POST presence", error);
    return NextResponse.json({ ok: false, database: false }, { status: 503 });
  }
}
