"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, File01Icon, Link01Icon, Pdf01Icon, SparklesIcon, ArrowRight02Icon, Loading01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";
import { formatRelativeTime, getDomain, highlightMatches, truncate } from "@/lib/utils";

const TYPE_META = {
  NOTE: { icon: File01Icon, color: "var(--note-color)" },
  URL: { icon: Link01Icon, color: "var(--url-color)" },
  PDF: { icon: Pdf01Icon, color: "var(--pdf-color)" },
} as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.search(debounced),
    enabled: debounced.length > 1,
    staleTime: 30_000,
  });

  const results = data?.results ?? [];

  return (
    <div className="page max-w-2xl mx-auto px-6 md:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="font-medium text-lg text-text-primary mb-1">Semantic search</h1>
        <p className="text-xs text-text-secondary">
          Find items by meaning. Powered by vector embeddings.
        </p>
      </div>

      <div className="relative mb-7">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything you've saved…"
          className="input h-11 rounded-xl pl-10 pr-10 text-sm"
        />
        {isFetching && (
          <HugeiconsIcon icon={Loading01Icon} className="absolute right-4 top-1/2 -translate-y-1/2 size-3.5 text-accent animate-spin" />
        )}
      </div>

      {debounced.length <= 1 ? (
        <div className="text-center py-16 text-text-muted text-xs">
          Type at least 2 characters to begin.
        </div>
      ) : results.length === 0 && !isFetching ? (
        <NoResults query={debounced} />
      ) : (
        <div className="space-y-2.5">
          {results.map((r, i) => {
            const meta = TYPE_META[r.type];
            const Icon = meta.icon;
            return (
              <Link
                key={r.id}
                href={`/library/${r.id}`}
                className="card-hover p-5 block transition-all duration-200 animate-slideUp"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <HugeiconsIcon icon={Icon} className="size-3.5" style={{ color: meta.color }} />
                  <h3
                    className="font-medium text-sm truncate text-text-primary"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatches(r.title, debounced),
                    }}
                  />
                  <span className="ml-auto text-xs text-text-muted shrink-0">
                    {Math.round(r.similarity * 100)}% match
                  </span>
                </div>
                {r.sourceUrl && (
                  <div className="text-xs text-text-muted mb-2">
                    {getDomain(r.sourceUrl)}
                  </div>
                )}
                <p
                  className="text-xs text-text-secondary leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatches(truncate(r.excerpt, 320), debounced),
                  }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-bg-border">
                  <span className="text-xs text-text-muted">
                    {formatRelativeTime(r.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                    Open <HugeiconsIcon icon={ArrowRight02Icon} className="size-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="size-12 rounded-2xl bg-accent-subtle flex items-center justify-center mx-auto mb-4">
        <HugeiconsIcon icon={Search01Icon} className="size-5 text-accent" />
      </div>
      <div className="font-medium text-sm mb-1 text-text-primary">
        Nothing found for &ldquo;{query}&rdquo;
      </div>
      <p className="text-xs text-text-secondary mb-6 leading-relaxed">
        Try different wording, or ask about it in chat.
      </p>
      <Link
        href={`/chat?q=${encodeURIComponent(query)}`}
        className="btn-secondary h-9 text-xs"
      >
        <HugeiconsIcon icon={SparklesIcon} className="size-3.5" /> Ask in Chat →
      </Link>
    </div>
  );
}
