import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDatabaseUrlForDebug } from "@/lib/server/prisma";
import { isPrismaConnectionError } from "@/lib/server/db-capabilities";
import { listProjectsDb, upsertProjectDb } from "@/lib/server/projects";
import type { Project } from "@svg-animator/types";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      projects: [],
      database: false,
      message: "Set DATABASE_URL and run docker compose up -d",
    });
  }

  try {
    const projects = await listProjectsDb();
    return NextResponse.json({ projects, database: true });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      const { resetPrismaClient } = await import("@/lib/server/prisma");
      resetPrismaClient();
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[db] Connection failed.",
          getDatabaseUrlForDebug(),
          "— run: docker compose up -d && pnpm db:push"
        );
      }
    } else {
      console.error("GET /api/projects", error);
    }
    return NextResponse.json(
      { error: "Database connection failed", database: false, projects: [] },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { project: Project };
    if (!body.project?.id) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const saved = await upsertProjectDb(body.project);
    return NextResponse.json({ ok: true, project: saved });
  } catch (error) {
    if (!isPrismaConnectionError(error)) console.error("POST /api/projects", error);
    const status = isPrismaConnectionError(error) ? 503 : 500;
    return NextResponse.json(
      { error: "Failed to save project", database: false },
      { status }
    );
  }
}
