import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/server/prisma";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null, workspace: null, database: false });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, workspace: null, database: true });
  }

  const prisma = getPrisma();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  return NextResponse.json({
    user,
    workspace: membership
      ? { id: membership.workspace.id, name: membership.workspace.name, slug: membership.workspace.slug, role: membership.role }
      : null,
    database: true,
  });
}
