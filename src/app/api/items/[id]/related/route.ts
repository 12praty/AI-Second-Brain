import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;
  const { id } = await ctx.params;

  // Average embedding of source item's chunks → query
  const rows = (await db.execute(sql`
    WITH source_centroid AS (
      SELECT AVG(embedding)::vector AS centroid
      FROM chunks
      WHERE item_id = ${id} AND embedding IS NOT NULL
    )
    SELECT DISTINCT ON (i.id)
           i.id,
           i.title,
           i.type,
           i.summary,
           i.created_at,
           1 - (c.embedding <=> sc.centroid) AS similarity
    FROM chunks c
    JOIN items i ON i.id = c.item_id
    CROSS JOIN source_centroid sc
    WHERE c.user_id = ${userId}
      AND i.id <> ${id}
      AND sc.centroid IS NOT NULL
      AND c.embedding IS NOT NULL
    ORDER BY i.id, c.embedding <=> sc.centroid ASC
    LIMIT 20
  `)) as unknown as Array<{
    id: string;
    title: string;
    type: "NOTE" | "URL" | "PDF";
    summary: string | null;
    created_at: string;
    similarity: number;
  }>;

  const sorted = rows
    .map((r) => ({ ...r, similarity: Number(r.similarity ?? 0) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);

  return NextResponse.json({
    items: sorted.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      summary: r.summary,
      createdAt: r.created_at,
      similarity: r.similarity,
    })),
  });
}
