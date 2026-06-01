import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  const rows = (await db.execute(sql`
    SELECT t.name AS name, COUNT(it.item_id)::int AS count
    FROM tags t
    LEFT JOIN item_tags it ON it.tag_id = t.id
    WHERE t.user_id = ${userId}
    GROUP BY t.name
    HAVING COUNT(it.item_id) > 0
    ORDER BY count DESC, name ASC
  `)) as unknown as Array<{ name: string; count: number }>;

  return NextResponse.json({
    tags: rows.map((r) => ({ name: r.name, count: Number(r.count) })),
  });
}
