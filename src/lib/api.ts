export type ItemSummary = {
  id: string;
  type: "NOTE" | "URL" | "PDF";
  status: "PROCESSING" | "READY" | "ERROR";
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

export type ItemDetail = ItemSummary & {
  content: string;
  chunkCount: number;
};

export type Stats = {
  total: number;
  notes: number;
  urls: number;
  pdfs: number;
  processing: number;
  bytes: number;
};

export type ChatRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRow = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: { itemId: string; title: string; excerpt: string; type: string }[] | null;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  title: string;
  type: "NOTE" | "URL" | "PDF";
  summary: string | null;
  sourceUrl: string | null;
  excerpt: string;
  createdAt: string;
  similarity: number;
};

export type TagRow = { name: string; count: number };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Network error — please check your connection and try again.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = (data as { error?: string }).error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Invalid response from server");
  }
}

export const api = {
  stats: () => request<Stats>("/api/stats"),
  listItems: (params: {
    type?: "NOTE" | "URL" | "PDF";
    tag?: string;
    sort?: "newest" | "oldest" | "alpha";
    limit?: number;
  } = {}) => {
    const sp = new URLSearchParams();
    if (params.type) sp.set("type", params.type);
    if (params.tag) sp.set("tag", params.tag);
    if (params.sort) sp.set("sort", params.sort);
    if (params.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return request<{ items: ItemSummary[] }>(`/api/items${qs ? `?${qs}` : ""}`);
  },
  getItem: (id: string) => request<{ item: ItemDetail }>(`/api/items/${id}`),
  related: (id: string) =>
    request<{ items: { id: string; title: string; type: string; summary: string | null; createdAt: string; similarity: number }[] }>(
      `/api/items/${id}/related`
    ),
  createNote: (input: { title?: string; content: string }) =>
    request<{ item: { id: string } }>("/api/items", {
      method: "POST",
      body: JSON.stringify({ type: "NOTE", ...input }),
    }),
  createUrl: (url: string) =>
    request<{ item: { id: string } }>("/api/items", {
      method: "POST",
      body: JSON.stringify({ type: "URL", url }),
    }),
  uploadPdf: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/items/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Upload failed");
    }
    return (await res.json()) as { item: { id: string } };
  },
  updateItem: (id: string, body: { title?: string; tags?: string[] }) =>
    request<{ ok: true }>(`/api/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteItem: (id: string) =>
    request<{ ok: true }>(`/api/items/${id}`, { method: "DELETE" }),
  search: (q: string) =>
    request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  tags: () => request<{ tags: TagRow[] }>("/api/tags"),
  listChats: () => request<{ chats: ChatRow[] }>("/api/chats"),
  createChat: () => request<{ chat: ChatRow }>("/api/chats", { method: "POST" }),
  getChat: (id: string) =>
    request<{ chat: ChatRow; messages: MessageRow[] }>(`/api/chats/${id}`),
  deleteChat: (id: string) =>
    request<{ ok: true }>(`/api/chats/${id}`, { method: "DELETE" }),
  renameChat: (id: string, title: string) =>
    request<{ ok: true }>(`/api/chats/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
};
