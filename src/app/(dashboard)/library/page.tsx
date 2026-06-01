"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, Link01Icon, Pdf01Icon, InboxIcon, Layers01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";
import { ItemCard, ItemCardSkeleton } from "@/components/item-card";
import { useCapture } from "@/components/capture-context";
import { cn } from "@/lib/utils";

type TypeFilter = "ALL" | "NOTE" | "URL" | "PDF";
type SortKey = "newest" | "oldest" | "alpha";

const TYPE_OPTS: { id: TypeFilter; label: string; icon?: typeof File01Icon; color?: string }[] = [
  { id: "ALL", label: "All", icon: Layers01Icon, color: "var(--accent)" },
  { id: "NOTE", label: "Notes", icon: File01Icon, color: "var(--note-color)" },
  { id: "URL", label: "URLs", icon: Link01Icon, color: "var(--url-color)" },
  { id: "PDF", label: "PDFs", icon: Pdf01Icon, color: "var(--pdf-color)" },
];

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const { openWith } = useCapture();
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    setActiveTag(searchParams.get("tag"));
  }, [searchParams]);

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ["items", { type, sort, tag: activeTag }],
    queryFn: () =>
      api.listItems({
        type: type === "ALL" ? undefined : type,
        sort,
        tag: activeTag ?? undefined,
        limit: 100,
      }),
    staleTime: 30_000,
  });

  const { data: tagsData } = useQuery({ queryKey: ["tags"], queryFn: api.tags });

  const items = itemsData?.items ?? [];
  const empty = !isLoading && items.length === 0;

  const tags = useMemo(() => tagsData?.tags ?? [], [tagsData]);

  return (
    <div className="page max-w-6xl mx-auto px-6 md:px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-medium text-lg text-text-primary">Library</h1>
          <p className="text-xs text-text-secondary mt-1">
            Everything you&apos;ve saved, indexed and searchable.
          </p>
        </div>
        <button onClick={() => openWith("note")} className="btn-primary h-9 text-xs">
          + Capture
        </button>
      </div>

      <div className="sticky top-0 md:top-0 z-10 -mx-6 md:-mx-8 px-6 md:px-8 py-4 bg-bg-base/80 backdrop-blur-sm border-b border-bg-border mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_OPTS.map((opt) => {
              const Icon = opt.icon!;
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 border min-h-[32px]",
                    active
                      ? "border-transparent text-white shadow-sm"
                      : "border-bg-border text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  )}
                  style={active ? { background: opt.color } : undefined}
                >
                  <HugeiconsIcon icon={Icon} className="size-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="chip border-accent text-accent whitespace-nowrap text-xs"
              >
                Clear filter ×
              </button>
            )}
            {(showAllTags ? tags : tags.slice(0, 8)).map((t) => {
              const active = activeTag === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setActiveTag(active ? null : t.name)}
                  className={cn(
                    "chip whitespace-nowrap transition-all duration-200 text-xs py-1.5",
                    active
                      ? "border-accent text-accent bg-accent-subtle"
                      : "hover:border-accent-border hover:text-text-primary"
                  )}
                >
                  #{t.name}
                  <span className="text-text-muted">{t.count}</span>
                </button>
                );
            })}
            {tags.length > 8 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="chip whitespace-nowrap text-xs text-accent border-accent shrink-0"
              >
                {showAllTags ? "Show less −" : `+${tags.length - 8} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {empty ? (
        <div className="card p-12 text-center">
          <HugeiconsIcon icon={InboxIcon} className="size-8 text-text-muted mx-auto mb-4" />
          <div className="font-serif text-xl mb-1.5 text-text-primary">Nothing here yet</div>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">
            {activeTag || type !== "ALL"
              ? "Try clearing your filters or capture something new."
              : "Save your first note, URL, or PDF to get started."}
          </p>
          <button onClick={() => openWith("note")} className="btn-primary h-9 text-xs">
            + Capture your first item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)
            : items.map((it, i) => <ItemCard key={it.id} item={it} index={i} />)}
        </div>
      )}
    </div>
  );
}

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  alpha: "A → Z",
};

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between gap-2 h-10 w-[140px] text-xs cursor-pointer"
      >
        <span className="text-text-secondary">{SORT_LABELS[value]}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[140px] rounded-xl border border-bg-border bg-bg-card shadow-md z-20 py-1 overflow-hidden">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors duration-150 ${
                key === value
                  ? "text-accent bg-accent-subtle font-medium"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
