"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";

export default function TagsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["tags"], queryFn: api.tags });
  const tags = data?.tags ?? [];

  return (
    <div className="page max-w-4xl mx-auto px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-medium text-lg text-text-primary">Tags</h1>
        <p className="text-xs text-text-secondary mt-1">
          AI-generated tags across all your saved content.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full skeleton" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="card p-10 text-center">
          <HugeiconsIcon icon={Tag01Icon} className="size-8 text-text-muted mx-auto mb-4" />
          <div className="font-medium text-sm mb-1 text-text-primary">No tags yet</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Save some items — we&apos;ll auto-generate tags as we process them.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {tags.map((t) => (
            <Link
              key={t.name}
              href={`/library?tag=${encodeURIComponent(t.name)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-bg-border bg-bg-elevated px-4 py-2 text-xs font-medium transition-all duration-200 hover:border-accent-border hover:text-accent hover:shadow-sm"
            >
              <span className="text-accent">#</span>
              {t.name}
              <span className="text-xs text-text-muted ml-0.5">{t.count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
