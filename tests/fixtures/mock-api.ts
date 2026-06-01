import type { Page, Route } from "@playwright/test";
import {
  buildItem,
  buildItemDetail,
  buildStats,
  buildTag,
  buildChat,
  buildMessage,
  buildSearchResult,
} from "./data";
import type { ItemSummary, Stats } from "@/lib/api";

type MockApiOptions = {
  items?: ItemSummary[];
  stats?: Stats;
  tags?: string[];
};

export async function mockApi(page: Page, opts: MockApiOptions = {}) {
  const {
    items = [
      buildItem({ id: "item-1", title: "Getting Started with React", type: "NOTE", tags: ["react", "frontend"], createdAt: new Date(Date.now() - 86400000).toISOString() }),
      buildItem({ id: "item-2", title: "Why Deep Work Matters", type: "URL", tags: ["productivity"], sourceUrl: "https://example.com/deep-work", createdAt: new Date(Date.now() - 172800000).toISOString() }),
      buildItem({ id: "item-3", title: "Algorithms Paper", type: "PDF", tags: ["algorithms"], createdAt: new Date(Date.now() - 259200000).toISOString() }),
    ],
    stats = buildStats({ total: items.length }),
    tags = [],
  } = opts;

  const tagsData = tags.map((t) => buildTag(t, items.filter((i) => i.tags.includes(t)).length));

  await page.route(/\/api\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // Auth endpoints
    if (path.startsWith("/api/auth/")) {
      return route.fulfill({ status: 200, json: { user: { id: "user-1", email: "test@example.com", name: "Test User" } } });
    }

    // Register
    if (path === "/api/register") {
      return route.fulfill({ status: 201, json: { id: "new-user", email: "test@example.com", name: "Test User" } });
    }

    // Stats
    if (path === "/api/stats") {
      return route.fulfill({ json: stats });
    }

    // Tags
    if (path === "/api/tags") {
      return route.fulfill({ json: { tags: tagsData } });
    }

    // Search
    if (path === "/api/search") {
      const q = url.searchParams.get("q") ?? "";
      if (q.length < 2) return route.fulfill({ json: { results: [] } });
      const results = items
        .filter((i) => i.title.toLowerCase().includes(q.toLowerCase()))
        .map((i) => buildSearchResult({ id: i.id, title: i.title, type: i.type, similarity: 0.92 }));
      return route.fulfill({ json: { results } });
    }

    // Items list & create
    if (path === "/api/items" && method === "GET") {
      const type = url.searchParams.get("type");
      const tag = url.searchParams.get("tag");
      const sort = url.searchParams.get("sort") ?? "newest";

      let filtered = [...items];
      if (type === "NOTE" || type === "URL" || type === "PDF") {
        filtered = filtered.filter((i) => i.type === type);
      }
      if (tag) {
        filtered = filtered.filter((i) => i.tags.includes(tag));
      }
      if (sort === "oldest") {
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sort === "alpha") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return route.fulfill({ json: { items: filtered } });
    }

    if (path === "/api/items" && method === "POST") {
      return route.fulfill({ status: 201, json: { item: { ...items[0], id: "new-item", status: "PROCESSING" } } });
    }

    // Item upload
    if (path === "/api/items/upload") {
      return route.fulfill({ status: 201, json: { item: { id: "pdf-item" } } });
    }

    // Item related (must be before /api/items/:id)
    if (path.match(/^\/api\/items\/[^/]+\/related$/)) {
      return route.fulfill({
        json: {
          items: items.slice(0, 3).map((i) => ({
            id: i.id,
            title: i.title,
            type: i.type,
            summary: i.summary,
            createdAt: i.createdAt,
            similarity: 0.75,
          })),
        },
      });
    }

    // Single item
    const itemMatch = path.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch) {
      const id = itemMatch[1];
      const item = items.find((i) => i.id === id);

      if (method === "GET") {
        if (!item) {
          return route.fulfill({ status: 404, json: { error: "Item not found" } });
        }
        return route.fulfill({
          json: {
            item: buildItemDetail({
              ...item,
              content: "This is the full content of the item. It contains detailed information that was saved by the user.",
              chunkCount: 5,
            }),
          },
        });
      }
      if (method === "PATCH") return route.fulfill({ json: { ok: true } });
      if (method === "DELETE") return route.fulfill({ json: { ok: true } });
    }

    // Chats list & create
    if (path === "/api/chats") {
      if (method === "POST") {
        const chat = buildChat();
        return route.fulfill({ status: 201, json: { chat } });
      }
      const chats = [buildChat()];
      return route.fulfill({ json: { chats } });
    }

    // Chat messages (SSE stream)
    if (path.match(/^\/api\/chats\/[^/]+\/messages$/)) {
      if (method === "POST") {
        const events = [
          `event: status\ndata: ${JSON.stringify({ stage: "searching" })}\n\n`,
          `event: sources\ndata: ${JSON.stringify({ sources: [{ itemId: "item-1", title: "Getting Started with React", excerpt: "React is a library for building user interfaces.", type: "NOTE" }] })}\n\n`,
          `event: delta\ndata: ${JSON.stringify({ text: "Based on your saved " })}\n\n`,
          `event: delta\ndata: ${JSON.stringify({ text: "items, here is the answer." })}\n\n`,
          `event: done\ndata: {}\n\n`,
        ].join("");
        return route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: events,
        });
      }
      return route.fulfill({ json: { ok: true } });
    }

    // Single chat
    const chatMatch = path.match(/^\/api\/chats\/([^/]+)$/);
    if (chatMatch) {
      if (method === "GET") {
        const chat = buildChat({ id: chatMatch[1] });
        const messages = [
          buildMessage({ id: "msg-1", role: "USER", content: "What do I know about React?" }),
          buildMessage({
            id: "msg-2",
            role: "ASSISTANT",
            content: "Based on your saved items, you have notes about React components and state management.",
            sources: [{ itemId: "item-1", title: "Getting Started with React", excerpt: "React components basics.", type: "NOTE" }],
          }),
        ];
        return route.fulfill({ json: { chat, messages } });
      }
      if (method === "PATCH") return route.fulfill({ json: { ok: true } });
      if (method === "DELETE") return route.fulfill({ json: { ok: true } });
    }

    return route.fulfill({ json: {} });
  });
}
