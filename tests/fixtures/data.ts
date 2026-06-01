import type { ItemSummary, ItemDetail, Stats, ChatRow, MessageRow, SearchResult, TagRow } from "@/lib/api";

export function buildItem(overrides: Partial<ItemSummary> = {}): ItemSummary {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    type: "NOTE",
    status: "READY",
    title: "Test item",
    summary: "A test item summary.",
    sourceUrl: null,
    fileName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}

export function buildItemDetail(overrides: Partial<ItemDetail> = {}): ItemDetail {
  return {
    ...buildItem(overrides),
    content: "Test content for the item detail page.",
    chunkCount: 5,
    ...overrides,
  };
}

export function buildStats(overrides: Partial<Stats> = {}): Stats {
  return {
    total: 12,
    notes: 5,
    urls: 4,
    pdfs: 3,
    processing: 0,
    bytes: 1048576,
    ...overrides,
  };
}

export function buildTag(name: string, count = 1): TagRow {
  return { name, count };
}

export function buildChat(overrides: Partial<ChatRow> = {}): ChatRow {
  return {
    id: crypto.randomUUID(),
    title: "Test chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: crypto.randomUUID(),
    role: "USER",
    content: "Test message content",
    createdAt: new Date().toISOString(),
    sources: null,
    ...overrides,
  };
}

export function buildSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: crypto.randomUUID(),
    title: "Search result",
    type: "NOTE",
    summary: "A search result summary.",
    sourceUrl: null,
    excerpt: "This is an excerpt from the search result showing matching content.",
    createdAt: new Date().toISOString(),
    similarity: 0.85,
    ...overrides,
  };
}
