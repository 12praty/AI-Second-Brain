import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, guard.session.userId)))
    .limit(1);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ chat, messages: msgs });
}

const patchSchema = z.object({ title: z.string().min(1).max(120) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db
    .update(chats)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(and(eq(chats.id, id), eq(chats.userId, guard.session.userId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const [deleted] = await db
    .delete(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, guard.session.userId)))
    .returning();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
