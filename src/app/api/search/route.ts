import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";
import { embed } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  let vec: number[];
  try {
    vec = await embed(q);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Embedding failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 }
    );
  }
  const vecLiteral = `[${vec.join(",")}]`;

  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (i.id)
           i.id,
           i.title,
           i.type,
           i.summary,
           i.source_url,
           i.created_at,
           c.content AS excerpt,
           1 - (c.embedding <=> ${vecLiteral}::vector) AS similarity
    FROM chunks c
    JOIN items i ON i.id = c.item_id
    WHERE c.user_id = ${userId}
      AND c.embedding IS NOT NULL
    ORDER BY i.id, c.embedding <=> ${vecLiteral}::vector ASC
    LIMIT 20
  `)) as unknown as Array<{
    id: string;
    title: string;
    type: "NOTE" | "URL" | "PDF";
    summary: string | null;
    source_url: string | null;
    created_at: string;
    excerpt: string;
    similarity: number;
  }>;

  const results = rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      summary: r.summary,
      sourceUrl: r.source_url,
      createdAt: r.created_at,
      excerpt: (r.excerpt || "").slice(0, 320),
      similarity: Number(r.similarity ?? 0),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 12);

  return NextResponse.json({ results });
}
