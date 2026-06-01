"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  Link01Icon,
  Pdf01Icon,
  Loading01Icon,
  Delete01Icon,
  ArrowUpRight02Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { cn, formatRelativeTime, getDomain } from "@/lib/utils";
import { api, type ItemSummary } from "@/lib/api";

const TYPE_META: Record<
  ItemSummary["type"],
  { label: string; icon: typeof File01Icon; color: string }
> = {
  NOTE: { label: "Note", icon: File01Icon, color: "var(--note-color)" },
  URL: { label: "URL", icon: Link01Icon, color: "var(--url-color)" },
  PDF: { label: "PDF", icon: Pdf01Icon, color: "var(--pdf-color)" },
};

export function ItemCard({ item, index }: { item: ItemSummary; index?: number }) {
  const Type = TYPE_META[item.type];
  const Icon = Type.icon;
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const isProcessing = item.status === "PROCESSING";
  const isError = item.status === "ERROR";

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteItem(item.id);
      toast.success("Item deleted permanently");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/library/${item.id}`}
      className={cn(
        "group relative card p-5 flex flex-col h-full transition-all duration-200 card-hover",
        isProcessing && "animate-pulse",
        isError && "border-error/30"
      )}
      style={
        index !== undefined ? { animationDelay: `${index * 30}ms` } : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium"
          style={{ background: `color-mix(in srgb, ${Type.color} 12%, transparent)`, color: Type.color }}
        >
          <HugeiconsIcon icon={Icon} className="size-3" />
          {Type.label}
        </span>
        <span className="text-xs text-text-muted">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>

      <h3 className="font-medium text-sm text-text-primary line-clamp-2 mb-1.5 leading-snug">
        {item.title}
      </h3>

      {item.type === "URL" && item.sourceUrl && (
        <div className="text-xs text-text-muted mb-2.5 truncate">
          {getDomain(item.sourceUrl)}
        </div>
      )}

      {isProcessing ? (
        <div className="flex-1 space-y-1.5 mb-4 pt-1">
          <div className="h-2 rounded skeleton" />
          <div className="h-2 rounded skeleton w-5/6" />
          <div className="h-2 rounded skeleton w-2/3" />
        </div>
      ) : isError ? (
        <div className="text-xs text-error mb-4 line-clamp-3 leading-relaxed">
          {item.summary || "Processing failed."}
        </div>
      ) : (
        <p className="flex-1 text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4">
          {item.summary ?? "No summary yet."}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 mt-auto border-t border-bg-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isProcessing && (
            <span className="inline-flex items-center gap-1 text-xs text-text-muted">
              <HugeiconsIcon icon={Loading01Icon} className="size-2.5 animate-spin" />
              Processing
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="size-9 grid place-items-center rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Delete"
          >
            {deleting ? (
              <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
            ) : (
              <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
            )}
          </button>
          {item.type === "URL" && item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="size-9 grid place-items-center rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
              aria-label="Open source"
            >
              <HugeiconsIcon icon={ArrowUpRight02Icon} className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="card p-5 h-48 space-y-3">
      <div className="flex justify-between">
        <div className="h-5 w-14 rounded skeleton" />
        <div className="h-3 w-10 rounded skeleton" />
      </div>
      <div className="h-4 w-3/4 rounded skeleton" />
      <div className="h-3 w-full rounded skeleton" />
      <div className="h-3 w-5/6 rounded skeleton" />
    </div>
  );
}
