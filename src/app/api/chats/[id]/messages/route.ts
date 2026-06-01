import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/api-auth";
import { retrieveContext, streamRagAnswer } from "@/lib/ai/rag";
import { generateChatTitle } from "@/lib/ai/gemini";

export const runtime = "nodejs";

const bodySchema = z.object({ content: z.string().min(1).max(4000) });

function sse(event: string, data: unknown) {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId } = guard.session;
  const { id: chatId } = await ctx.params;

  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const userText = parsed.data.content.trim();

  // Persist user message immediately
  await db.insert(messages).values({
    chatId,
    role: "USER",
    content: userText,
  });

  // Auto-title: if this is the first user message, kick off (background, don't wait)
  if (chat.title === "New chat" || chat.title === "New Chat") {
    generateChatTitle(userText)
      .then(async (title) => {
        await db
          .update(chats)
          .set({ title: title.slice(0, 80), updatedAt: new Date() })
          .where(eq(chats.id, chatId));
      })
      .catch((err) => {
        console.error("Failed to generate chat title:", err);
      });
  } else {
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => { if (!closed) { closed = true; try { controller.close(); } catch {} } };
      req.signal.addEventListener("abort", close, { once: true });

      try {
        controller.enqueue(sse("status", { stage: "searching" }));

        const context = await retrieveContext(userId, userText, { limit: 6 });

        if (req.signal.aborted) { close(); return; }

        controller.enqueue(
          sse("sources", {
            sources: context.map((c) => ({
              chunkId: c.chunkId,
              itemId: c.itemId,
              title: c.title,
              type: c.type,
              sourceUrl: c.sourceUrl,
              excerpt: c.content.slice(0, 280),
              similarity: c.similarity,
            })),
          })
        );

        if (req.signal.aborted) { close(); return; }

        controller.enqueue(sse("status", { stage: "thinking" }));

        let full = "";
        for await (const tok of streamRagAnswer(userText, context)) {
          if (req.signal.aborted) { close(); return; }
          full += tok;
          controller.enqueue(sse("delta", { text: tok }));
        }

        // Persist assistant message
        const sources = context.map((c) => ({
          itemId: c.itemId,
          title: c.title,
          excerpt: c.content.slice(0, 280),
          type: c.type,
        }));
        await db.insert(messages).values({
          chatId,
          role: "ASSISTANT",
          content: full,
          sources,
        });

        controller.enqueue(sse("done", { ok: true }));
        close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(sse("error", { error: message }));
        try { controller.close(); } catch {}
      } finally {
        req.signal.removeEventListener("abort", close);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
