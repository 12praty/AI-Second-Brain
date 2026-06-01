import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";
import { extractFromPdf } from "@/lib/ai/extract";
import { processItem } from "@/lib/ai/ingestion";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 413 });
  }

  const isPdf =
    file.type === "application/pdf" ||
    (file.name && file.name.toLowerCase().endsWith(".pdf"));
  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 415 });
  }

  let text = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractFromPdf(buffer);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Couldn't read PDF: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 422 }
    );
  }

  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: "PDF didn't contain enough extractable text." },
      { status: 422 }
    );
  }

  const title = file.name.replace(/\.pdf$/i, "").slice(0, 200) || "Untitled PDF";

  const [created] = await db
    .insert(items)
    .values({
      userId,
      type: "PDF",
      title,
      content: text,
      fileName: file.name,
      status: "PROCESSING",
    })
    .returning();

  await processItem(created.id);
  const [updated] = await db
    .select({ id: items.id, status: items.status })
    .from(items)
    .where(eq(items.id, created.id))
    .limit(1);
  return NextResponse.json({ item: { ...created, status: updated?.status ?? created.status } }, { status: 201 });
}
