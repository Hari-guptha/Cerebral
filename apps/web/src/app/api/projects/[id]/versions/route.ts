import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/server/prisma";
import {
  createVersionDb,
  listVersionsDb,
  pruneAutoVersions,
} from "@/lib/server/projects";
import type { Project } from "@svg-animator/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const versions = await listVersionsDb(id);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("GET /api/projects/[id]/versions", error);
    return NextResponse.json({ error: "Failed to list versions" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { project: Project; label?: string };
    if (!body.project || body.project.id !== id) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const label =
      body.label?.trim() ||
      `Version ${new Date().toLocaleString()}`;

    const version = await createVersionDb(id, body.project, label);

    if (label.startsWith("Auto ·")) {
      await pruneAutoVersions(id, 30);
    }

    return NextResponse.json({ ok: true, version });
  } catch (error) {
    console.error("POST /api/projects/[id]/versions", error);
    return NextResponse.json({ error: "Failed to save version" }, { status: 500 });
  }
}
