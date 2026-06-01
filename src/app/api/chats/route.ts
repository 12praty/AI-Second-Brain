import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, guard.session.userId))
    .orderBy(desc(chats.updatedAt))
    .limit(50);
  return NextResponse.json({ chats: rows });
}

export async function POST() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const [created] = await db
    .insert(chats)
    .values({ userId: guard.session.userId, title: "New chat" })
    .returning();
  return NextResponse.json({ chat: created }, { status: 201 });
}
