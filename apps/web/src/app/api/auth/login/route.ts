import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/server/prisma";
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: "asc" } },
    });

    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name });
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      workspace: membership
        ? { id: membership.workspace.id, name: membership.workspace.name, slug: membership.workspace.slug }
        : null,
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
