import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/server/prisma";
import { getVersionDb } from "@/lib/server/projects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { versionId } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const project = await getVersionDb(versionId);
    if (!project) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET /api/projects/[id]/versions/[versionId]", error);
    return NextResponse.json({ error: "Failed to load version" }, { status: 500 });
  }
}
