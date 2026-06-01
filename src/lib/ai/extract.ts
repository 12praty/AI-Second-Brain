function isPrivateHost(hostname: string): boolean {
  const ip = hostname.toLowerCase();
  if (ip === "localhost" || ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.endsWith(".local") || ip.endsWith(".internal")) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  return false;
}

export async function extractFromUrl(
  url: string
): Promise<{ title: string; content: string }> {
  const parsed = new URL(url);
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Fetching from private or internal network addresses is not allowed");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SecondBrainBot/1.0; +https://example.com)",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();

  let title = "";
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (ogTitleMatch) title = decodeHtmlEntities(ogTitleMatch[1].trim());
  else if (titleMatch) title = decodeHtmlEntities(titleMatch[1].trim());
  else title = url;

  let stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

  const articleMatch = stripped.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) stripped = articleMatch[0];

  const text = stripped
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title: title || url, content: decodeHtmlEntities(text) };
}

function decodeHtmlEntities(str: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return str
    .replace(/&[a-z#0-9]+;/gi, (m) => named[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export async function extractFromPdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse =
    (mod as unknown as { default?: (b: Buffer) => Promise<{ text: string }> })
      .default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
  const data = await pdfParse(buffer);
  return (data.text || "").replace(/\u0000/g, "").trim();
}
