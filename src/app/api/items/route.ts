import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { items, tags as tagsTable, itemTags } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";
import { extractFromUrl } from "@/lib/ai/extract";
import { processItem } from "@/lib/ai/ingestion";

export const runtime = "nodejs";

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("NOTE"),
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(200_000),
  }),
  z.object({
    type: z.literal("URL"),
    url: z.string().url(),
  }),
]);

export async function GET(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const tag = searchParams.get("tag");
  const sort = searchParams.get("sort") ?? "newest";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const conditions = [eq(items.userId, userId)];
  if (type === "NOTE" || type === "URL" || type === "PDF") {
    conditions.push(eq(items.type, type));
  }

  const orderClause =
    sort === "oldest"
      ? items.createdAt
      : sort === "alpha"
        ? items.title
        : desc(items.createdAt);

  let rows: Array<typeof items.$inferSelect> = [];

  if (tag) {
    // Filter by tag via join
    const [tagRow] = await db
      .select({ id: tagsTable.id })
      .from(tagsTable)
      .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tag.toLowerCase())))
      .limit(1);
    if (!tagRow) return NextResponse.json({ items: [] });

    const joined = await db
      .select({ item: items })
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(and(...conditions, eq(itemTags.tagId, tagRow.id)))
      .orderBy(orderClause)
      .limit(limit);
    rows = joined.map((j) => j.item);
  } else {
    rows = await db
      .select()
      .from(items)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit);
  }

  // Fetch tags for these items in one go
  const ids = rows.map((r) => r.id);
  const tagsByItem = new Map<string, string[]>();
  if (ids.length > 0) {
    const tagRows = await db.execute<{ item_id: string; name: string }>(sql`
      SELECT it.item_id AS item_id, t.name AS name
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      WHERE it.item_id IN (${sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `
      )})
    `);
    for (const row of tagRows as unknown as Array<{ item_id: string; name: string }>) {
      const list = tagsByItem.get(row.item_id) ?? [];
      list.push(row.name);
      tagsByItem.set(row.item_id, list);
    }
  }

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      title: r.title,
      summary: r.summary,
      sourceUrl: r.sourceUrl,
      fileName: r.fileName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      tags: tagsByItem.get(r.id) ?? [],
    })),
  });
}

export async function POST(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.type === "NOTE") {
    const inferredTitle =
      data.title?.trim() ||
      data.content
        .split("\n")
        .find((l) => l.trim().length > 0)
        ?.trim()
        .slice(0, 80) ||
      "Untitled note";

    const [created] = await db
      .insert(items)
      .values({
        userId,
        type: "NOTE",
        title: inferredTitle,
        content: data.content,
        status: "PROCESSING",
      })
      .returning();

    processItem(created.id).catch((err) => {
      console.error("Background processing failed for item", created.id, err);
    });
    return NextResponse.json({ item: { ...created, status: "PROCESSING" } }, { status: 201 });
  }

  // URL
  let scraped: { title: string; content: string };
  try {
    scraped = await extractFromUrl(data.url);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to fetch URL: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 422 }
    );
  }

  if (!scraped.content || scraped.content.length < 50) {
    return NextResponse.json(
      { error: "Couldn't extract meaningful text from that page." },
      { status: 422 }
    );
  }

  const [created] = await db
    .insert(items)
    .values({
      userId,
      type: "URL",
      title: scraped.title.slice(0, 200) || data.url,
      content: scraped.content,
      sourceUrl: data.url,
      status: "PROCESSING",
    })
    .returning();

  processItem(created.id).catch((err) => {
    console.error("Background processing failed for item", created.id, err);
  });
  return NextResponse.json({ item: { ...created, status: "PROCESSING" } }, { status: 201 });
}
