import { db } from "@/lib/db";
import { items, chunks, tags as tagsTable, itemTags } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { chunkText } from "@/lib/ai/chunking";
import { embedBatch, generateSummary } from "@/lib/ai/gemini";

/**
 * Process a saved item: split into chunks, embed, generate summary + tags.
 * Updates item.status to READY (or ERROR on failure).
 */
export async function processItem(itemId: string): Promise<void> {
  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return;
  if (!item.content || item.content.trim().length === 0) {
    await db
      .update(items)
      .set({ status: "ERROR", summary: "No content found.", updatedAt: new Date() })
      .where(eq(items.id, itemId));
    return;
  }

  try {
    // 1. Chunk the text
    const pieces = chunkText(item.content, { maxChars: 1200, overlap: 150 });
    const safePieces = pieces.length > 0 ? pieces : [item.content.slice(0, 1200)];

    // 2. Embed all chunks
    const vectors = await embedBatch(safePieces);

    // 3. Wipe any prior chunks for this item, then insert new ones
    await db.delete(chunks).where(eq(chunks.itemId, item.id));

    for (let i = 0; i < safePieces.length; i++) {
      const vec = vectors[i];
      if (!vec || vec.length === 0) continue;
      // Validate every value is a finite number to prevent SQL injection
      if (!vec.every((v) => Number.isFinite(v))) continue;
      await db.execute(sql`
        INSERT INTO chunks (item_id, user_id, content, chunk_index, embedding)
        VALUES (${item.id}, ${item.userId}, ${safePieces[i]}, ${i}, ${`[${vec.join(",")}]`}::vector)
      `);
    }

    // 4. Summary + tags via Gemini — best effort; chunks/embeddings are
    //    already saved so the item is searchable even if this step fails.
    let summary: string;
    let tagNames: string[] = [];
    try {
      const result = await generateSummary(item.title, item.content);
      summary = result.summary;
      tagNames = result.tags;
    } catch (err) {
      console.warn(`Summary generation failed for ${item.id}:`, err);
      summary = item.content.slice(0, 280).trim() + (item.content.length > 280 ? "…" : "");
    }

    // 5. Persist tags (upsert per user)
    const cleanTags = Array.from(new Set(tagNames.map((t) => t.toLowerCase().trim()).filter(Boolean))).slice(0, 8);
    for (const name of cleanTags) {
      const [existing] = await db
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(and(eq(tagsTable.userId, item.userId), eq(tagsTable.name, name)))
        .limit(1);
      let tagId = existing?.id;
      if (!tagId) {
        const [created] = await db
          .insert(tagsTable)
          .values({ userId: item.userId, name })
          .returning({ id: tagsTable.id });
        tagId = created.id;
      }
      await db
        .insert(itemTags)
        .values({ itemId: item.id, tagId })
        .onConflictDoNothing();
    }

    await db
      .update(items)
      .set({ status: "READY", summary, updatedAt: new Date() })
      .where(eq(items.id, item.id));
  } catch (err) {
    console.error(`Failed to process item ${itemId}:`, err);
    await db
      .update(items)
      .set({
        status: "ERROR",
        summary:
          err instanceof Error
            ? `Processing failed: ${err.message.slice(0, 200)}`
            : "Processing failed.",
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));
  }
}

/**
 * Fire-and-forget. Processing happens in the background after the API responds.
 */

