import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { items, chunks, itemTags, tags as tagsTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, guard.session.userId)))
    .limit(1);

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tagRows = await db
    .select({ name: tagsTable.name })
    .from(itemTags)
    .innerJoin(tagsTable, eq(tagsTable.id, itemTags.tagId))
    .where(eq(itemTags.itemId, id));

  const [{ count } = { count: 0 }] = (await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM chunks WHERE item_id = ${id}
  `)) as unknown as Array<{ count: number }>;

  return NextResponse.json({
    item: {
      ...item,
      tags: tagRows.map((t) => t.name),
      chunkCount: count,
    },
  });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const { userId } = guard.session;

  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.title) {
    await db
      .update(items)
      .set({ title: parsed.data.title, updatedAt: new Date() })
      .where(eq(items.id, id));
  }

  if (parsed.data.tags) {
    const cleanTags = Array.from(
      new Set(parsed.data.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))
    );
    await db.delete(itemTags).where(eq(itemTags.itemId, id));
    for (const name of cleanTags) {
      const [existing] = await db
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, name)))
        .limit(1);
      let tagId = existing?.id;
      if (!tagId) {
        const [created] = await db
          .insert(tagsTable)
          .values({ userId, name })
          .returning({ id: tagsTable.id });
        tagId = created.id;
      }
      await db.insert(itemTags).values({ itemId: id, tagId }).onConflictDoNothing();
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, guard.session.userId)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(chunks).where(eq(chunks.itemId, id));
  await db.delete(itemTags).where(eq(itemTags.itemId, id));
  await db.delete(items).where(eq(items.id, id));
  return NextResponse.json({ ok: true });
}
