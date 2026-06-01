"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowUpRight02Icon,
  File01Icon,
  Pdf01Icon,
  Link01Icon,
  Loading01Icon,
  Message01Icon,
  Add01Icon,
  SparklesIcon,
  Delete01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { api, type ItemDetail } from "@/lib/api";
import { cn, formatRelativeTime, getDomain, truncate } from "@/lib/utils";

const TYPE_META = {
  NOTE: { label: "Note", icon: File01Icon, color: "var(--note-color)" },
  URL: { label: "Article", icon: Link01Icon, color: "var(--url-color)" },
  PDF: { label: "PDF", icon: Pdf01Icon, color: "var(--pdf-color)" },
} as const;

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tagInput, setTagInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["item", id],
    queryFn: () => api.getItem(id),
    refetchInterval: (q) =>
      q.state.data?.item.status === "PROCESSING" ? 2500 : false,
  });

  const { data: relatedData } = useQuery({
    queryKey: ["related", id],
    queryFn: () => api.related(id),
    enabled: data?.item.status === "READY",
  });

  if (isLoading) {
    return (
      <div className="page max-w-5xl mx-auto px-6 md:px-8 py-8">
        <div className="h-6 w-24 skeleton rounded mb-6" />
        <div className="h-8 w-2/3 skeleton rounded mb-2" />
        <div className="h-4 w-1/3 skeleton rounded" />
      </div>
    );
  }

  if (error || !data?.item) {
    return (
      <div className="page max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-2xl mb-2 text-text-primary">Item not found</h1>
        <p className="text-sm text-text-secondary mb-6">
          It may have been deleted, or you don&apos;t have access.
        </p>
        <Link href="/library" className="btn-secondary text-xs">
          Back to library
        </Link>
      </div>
    );
  }

  const item = data.item;
  const Type = TYPE_META[item.type];
  const Icon = Type.icon;
  const isProcessing = item.status === "PROCESSING";

  async function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (!value) return;
    setAdding(true);
    try {
      const cached = queryClient.getQueryData<{ item: ItemDetail }>(["item", id]);
      const currentTags = cached?.item?.tags ?? item.tags;
      const next = Array.from(new Set([...currentTags, value]));
      await api.updateItem(id, { tags: next });
      setTagInput("");
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setAdding(false);
    }
  }

  async function removeTag(name: string) {
    try {
      const cached = queryClient.getQueryData<{ item: ItemDetail }>(["item", id]);
      const currentTags = cached?.item?.tags ?? item.tags;
      const next = currentTags.filter((t) => t !== name);
      await api.updateItem(id, { tags: next });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function startChatAbout() {
    try {
      const { chat } = await api.createChat();
      await api.renameChat(chat.id, `About: ${truncate(item.title, 40)}`);
      router.push(`/chat/${chat.id}?prefill=${encodeURIComponent(`Tell me about "${item.title}"`)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this item permanently?")) return;
    setDeleting(true);
    try {
      await api.deleteItem(id);
      toast.success("Item deleted permanently");
      router.push("/library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setDeleting(false);
    }
  }

  return (
    <div className="page max-w-5xl mx-auto px-6 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="btn-ghost h-8 text-xs"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" /> Back
        </button>
        <button
          onClick={handleDelete}
          className="btn-ghost h-8 text-xs text-text-muted hover:text-error"
          disabled={deleting}
        >
          {deleting ? <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" /> : <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />}
          Delete
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-medium"
          style={{ background: `color-mix(in srgb, ${Type.color} 12%, transparent)`, color: Type.color }}
        >
          <HugeiconsIcon icon={Icon} className="size-3" />
          {Type.label}
        </span>
        {isProcessing && (
          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
            <HugeiconsIcon icon={Loading01Icon} className="size-2.5 animate-spin" /> Processing
          </span>
        )}
        {item.status === "ERROR" && (
          <span className="inline-flex items-center gap-1 text-xs text-error">
            Error
          </span>
        )}
      </div>

      <h1 className="font-serif text-2xl md:text-3xl mb-2 text-text-primary leading-tight">{item.title}</h1>
      {item.type === "URL" && item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover mb-6 transition-colors"
        >
          {getDomain(item.sourceUrl)} <HugeiconsIcon icon={ArrowUpRight02Icon} className="size-3" />
        </a>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        <div className="lg:col-span-3 min-w-0">
          <div className="card p-6">
            <div className="markdown-body whitespace-pre-wrap">
              {item.type === "NOTE" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.content}
                </ReactMarkdown>
              ) : (
                <div className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                  {item.content}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-accent">
              <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
              AI Summary
            </div>
            {isProcessing ? (
              <div className="space-y-1.5">
                <div className="h-2.5 skeleton rounded" />
                <div className="h-2.5 skeleton rounded w-5/6" />
                <div className="h-2.5 skeleton rounded w-2/3" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-text-secondary">
                {item.summary || "No summary available."}
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs bg-accent-subtle text-accent font-medium"
                >
                  #{t}
                  <button
                    onClick={() => removeTag(t)}
                    className="opacity-50 hover:opacity-100 transition-opacity p-1 grid place-items-center"
                    aria-label={`Remove ${t}`}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="bg-transparent border-b border-bg-border text-xs px-1.5 py-1 focus:border-accent outline-none w-24 text-text-primary"
                  placeholder="add tag"
                />
                <button
                  onClick={addTag}
                  className="text-text-muted hover:text-accent transition-colors"
                  disabled={adding || !tagInput.trim()}
                >
                  {adding ? <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" /> : <HugeiconsIcon icon={Add01Icon} className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
              Metadata
            </div>
            <dl className="text-xs space-y-2">
              <Row label="Saved" value={formatRelativeTime(item.createdAt)} />
              <Row label="Type" value={Type.label} />
              <Row label="Chunks" value={`${item.chunkCount}`} />
              <Row
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
                      item.status === "READY" && "bg-success/15 text-success",
                      item.status === "PROCESSING" && "bg-warning/15 text-warning",
                      item.status === "ERROR" && "bg-error/15 text-error"
                    )}
                  >
                    {item.status}
                  </span>
                }
              />
            </dl>
          </div>

          {relatedData && relatedData.items.length > 0 && (
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
                Related items
              </div>
              <div className="space-y-1.5">
                {relatedData.items.slice(0, 4).map((r) => (
                  <Link
                    key={r.id}
                    href={`/library/${r.id}`}
                    className="block p-3 rounded-xl hover:bg-bg-elevated transition-colors border border-bg-border"
                  >
                    <div className="text-xs font-medium line-clamp-1 text-text-primary">
                      {r.title}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {Math.round(r.similarity * 100)}% match · {formatRelativeTime(r.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button onClick={startChatAbout} className="btn-primary w-full h-9 text-xs">
            <HugeiconsIcon icon={Message01Icon} className="size-3.5" />
            Chat about this →
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-primary text-right">{value}</dd>
    </div>
  );
}
