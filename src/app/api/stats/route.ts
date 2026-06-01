import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  const [counts] = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE type = 'NOTE')::int AS note_count,
      COUNT(*) FILTER (WHERE type = 'URL')::int AS url_count,
      COUNT(*) FILTER (WHERE type = 'PDF')::int AS pdf_count,
      COUNT(*) FILTER (WHERE status = 'PROCESSING')::int AS processing_count,
      COUNT(*)::int AS total,
      COALESCE(SUM(LENGTH(content)), 0)::bigint AS total_bytes
    FROM items
    WHERE user_id = ${userId}
  `)) as unknown as Array<{
    note_count: number;
    url_count: number;
    pdf_count: number;
    processing_count: number;
    total: number;
    total_bytes: number;
  }>;

  return NextResponse.json({
    total: counts?.total ?? 0,
    notes: counts?.note_count ?? 0,
    urls: counts?.url_count ?? 0,
    pdfs: counts?.pdf_count ?? 0,
    processing: counts?.processing_count ?? 0,
    bytes: Number(counts?.total_bytes ?? 0),
  });
}
