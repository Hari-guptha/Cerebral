import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/server/prisma";
import { slugify } from "@/lib/server/auth";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ workspaces: [], database: false });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ workspaces: [], database: true });
  }

  const prisma = getPrisma();
  const members = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { workspace: { name: "asc" } },
  });

  return NextResponse.json({
    workspaces: members.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    })),
    database: true,
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  let slug = slugify(name);
  const prisma = getPrisma();
  if (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  return NextResponse.json({
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, role: "owner" },
  });
}
