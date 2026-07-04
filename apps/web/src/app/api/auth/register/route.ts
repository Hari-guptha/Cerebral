import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/server/prisma";
import { hashPassword, createSessionToken, sessionCookieOptions, slugify } from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      workspaceName?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const name = body.name?.trim() || email?.split("@")[0] || "User";

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Valid email and password (6+ chars) required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const wsName = body.workspaceName?.trim() || `${name}'s Workspace`;
    let slug = slugify(wsName);
    const slugTaken = await prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${user.id.slice(0, 6)}`;

    const workspace = await prisma.workspace.create({
      data: {
        name: wsName,
        slug,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });

    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name });
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (error) {
    console.error("POST /api/auth/register", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
