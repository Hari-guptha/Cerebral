import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/server/prisma";
import type { Project } from "@svg-animator/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const prisma = getPrisma();
    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: { project: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Share link expired" }, { status: 410 });
    }

    return NextResponse.json({
      project: link.project.data as unknown as Project,
      name: link.project.name,
      mode: link.mode,
      projectId: link.projectId,
    });
  } catch (error) {
    console.error("GET /api/share", error);
    return NextResponse.json({ error: "Failed to load shared project" }, { status: 500 });
  }
}
