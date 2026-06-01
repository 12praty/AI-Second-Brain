export function chunkText(
  text: string,
  options: { maxChars?: number; overlap?: number } = {}
): string[] {
  const maxChars = options.maxChars ?? 1200;
  const overlap = options.overlap ?? 150;
  const step = maxChars - overlap;
  if (step <= 0) throw new Error("overlap must be less than maxChars");
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length <= maxChars) {
      current = current ? current + "\n\n" + p : p;
    } else {
      if (current) chunks.push(current);
      if (p.length <= maxChars) {
        current = p;
      } else {
        for (let i = 0; i < p.length; i += step) {
          chunks.push(p.slice(i, i + maxChars));
          if (chunks.length > 10000) break;
        }
        current = "";
      }
    }
  }
  if (current) chunks.push(current);

  const withOverlap: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      withOverlap.push(chunks[i]);
    } else {
      const prev = chunks[i - 1];
      const tailLen = Math.min(overlap, prev.length);
      const tail = prev.slice(prev.length - tailLen);
      withOverlap.push(tail + " " + chunks[i]);
    }
  }
  return withOverlap.filter((c) => c.trim().length > 30);
}
