import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/server/prisma";
import { deleteProjectDb, getProjectDb, upsertProjectDb } from "@/lib/server/projects";
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
    const project = await getProjectDb(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { project: Project };
    if (!body.project || body.project.id !== id) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const saved = await upsertProjectDb(body.project);
    return NextResponse.json({ ok: true, project: saved });
  } catch (error) {
    console.error("PUT /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    await deleteProjectDb(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
