import {
  GoogleGenerativeAI,
  TaskType,
  type EmbedContentRequest,
} from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("GOOGLE_GENERATIVE_AI_API_KEY is not set — AI features will fail");
  } else {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");
  }
}

export const genAI = new GoogleGenerativeAI(apiKey ?? "");

// gemini-embedding-001 is a Matryoshka model — we ask for 768 dims so the
// vectors fit our pgvector(768) column.
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMS = 768;
export const CHAT_MODEL = "gemini-2.5-flash";
// Summaries use a lighter / higher-quota model so background ingestion doesn't
// block on flagship-model rate limits.
export const SUMMARY_MODEL = "gemini-2.5-flash-lite";

function buildEmbedRequest(text: string, taskType: TaskType): EmbedContentRequest {
  // outputDimensionality isn't yet typed in @google/generative-ai but the API
  // accepts it for Matryoshka embedding models like gemini-embedding-001.
  return {
    content: { role: "user", parts: [{ text }] },
    taskType,
    outputDimensionality: EMBEDDING_DIMS,
  } as EmbedContentRequest & { outputDimensionality: number };
}

/**
 * gemini-embedding-001 only pre-normalizes vectors at the default 3072 dim.
 * Cosine distance requires unit-length vectors, so normalize manually.
 */
function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function embed(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_QUERY
): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(buildEmbedRequest(text, taskType));
  return l2Normalize(result.embedding.values);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const out: number[][] = [];
  const concurrency = 4;
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((t) =>
        model
          .embedContent(buildEmbedRequest(t, TaskType.RETRIEVAL_DOCUMENT))
          .then((r) => l2Normalize(r.embedding.values))
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        out.push(r.value);
      } else {
        console.error("Embedding failed for a chunk:", r.reason);
        out.push([]);
      }
    }
  }
  return out;
}

export async function generateSummary(
  title: string,
  content: string
): Promise<{ summary: string; tags: string[] }> {
  const model = genAI.getGenerativeModel({
    model: SUMMARY_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });
  const trimmed = content.length > 12000 ? content.slice(0, 12000) : content;
  const prompt = `You are a knowledge base assistant. Given the title and content of a saved item, return JSON with:
- "summary": a concise 2-3 sentence summary in plain prose
- "tags": an array of 3-5 lowercase, single or two-word tags relevant to the content

Return ONLY valid JSON matching: { "summary": string, "tags": string[] }

Title: ${title}

Content:
${trimmed}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const parsed = JSON.parse(text);
        return {
          summary: String(parsed.summary || "").trim(),
          tags: Array.isArray(parsed.tags)
            ? parsed.tags
                .map((t: unknown) => String(t).toLowerCase().trim())
                .filter((t: string) => t.length > 0 && t.length < 30)
                .slice(0, 5)
            : [],
        };
      } catch {
        return { summary: text.slice(0, 400), tags: [] };
      }
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Retry transient errors only.
      if (!/(503|overload|UNAVAILABLE|temporarily|deadline)/i.test(msg)) break;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Summary failed");
}

export async function generateChatTitle(question: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: SUMMARY_MODEL });
  const prompt = `Create a short 2-5 word title for a chat that starts with this question. Return ONLY the title, no quotes, no punctuation.\n\nQuestion: ${question}`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^["']|["']$/g, "");
    return text.slice(0, 60) || "New Chat";
  } catch {
    return question.slice(0, 50);
  }
}
