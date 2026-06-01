"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  File01Icon,
  Link01Icon,
  Pdf01Icon,
  Message01Icon,
  SparklesIcon,
  AiBrain02Icon,
} from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";
import { ItemCard, ItemCardSkeleton } from "@/components/item-card";
import { useCapture } from "@/components/capture-context";

export default function HomePage() {
  const { data: session } = useSession();
  const { openWith } = useCapture();
  const greeting = greetingFor(session?.user?.name);

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const { data: itemsData, isLoading, isError } = useQuery({
    queryKey: ["items", { recent: true }],
    queryFn: () => api.listItems({ limit: 6 }),
  });

  const items = itemsData?.items ?? [];
  const empty = !isLoading && !isError && items.length === 0;

  return (
    <div className="page max-w-5xl mx-auto px-6 md:px-8 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-xl font-medium mb-1.5 text-text-primary">{greeting}</h1>
        <p className="text-sm text-text-secondary">
          {stats && stats.total > 0
            ? `Your second brain has ${stats.total} item${stats.total === 1 ? "" : "s"} indexed and searchable.`
            : "Save anything, find everything, ask questions about it all."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="All items" value={stats?.total ?? 0} />
            <StatCard label="Notes" value={stats?.notes ?? 0} color="var(--note-color)" />
            <StatCard label="URLs" value={stats?.urls ?? 0} color="var(--url-color)" />
            <StatCard label="PDFs" value={stats?.pdfs ?? 0} color="var(--pdf-color)" />
          </>
        )}
      </div>

      {isError ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-text-secondary">Failed to load recent items. Please try again later.</p>
        </div>
      ) : empty ? (
        <EmptyState
          onWriteNote={() => openWith("note")}
          onSaveUrl={() => openWith("url")}
          onUploadPdf={() => openWith("pdf")}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium text-base text-text-primary">Recent</h2>
            <Link
              href="/library"
              className="text-xs text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              View all
              <HugeiconsIcon icon={ArrowRight02Icon} className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)
              : items.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
          </div>
        </>
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/chat"
          className="card-hover p-5 flex items-start gap-4 transition-all duration-200"
        >
          <div className="size-10 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Message01Icon} className="size-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-0.5 text-text-primary">Chat with your knowledge</div>
            <div className="text-xs text-text-secondary leading-relaxed">
              Ask anything — get answers cited from your saved items.
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-3.5 text-text-muted shrink-0 mt-1" />
        </Link>
        <Link
          href="/search"
          className="card-hover p-5 flex items-start gap-4 transition-all duration-200"
        >
          <div className="size-10 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={SparklesIcon} className="size-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-0.5 text-text-primary">Semantic search</div>
            <div className="text-xs text-text-secondary leading-relaxed">
              Find items by meaning, not just keywords.
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-3.5 text-text-muted shrink-0 mt-1" />
        </Link>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
      <div className="h-7 w-12 bg-bg-elevated rounded" />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div className="text-2xl font-medium tracking-tight" style={color ? { color } : { color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  onWriteNote,
  onSaveUrl,
  onUploadPdf,
}: {
  onWriteNote: () => void;
  onSaveUrl: () => void;
  onUploadPdf: () => void;
}) {
  return (
    <div className="card p-12 text-center">
      <div className="size-14 rounded-2xl bg-accent-subtle flex items-center justify-center mx-auto mb-5">
        <HugeiconsIcon icon={AiBrain02Icon} className="size-7 text-accent" />
      </div>
      <h2 className="font-serif text-2xl mb-2 text-text-primary">Your second brain is empty</h2>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed max-w-sm mx-auto">
        Save your first note, article, or PDF to begin building your knowledge base.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-md mx-auto">
        <ActionCard
          icon={<HugeiconsIcon icon={File01Icon} className="size-4" style={{ color: "var(--note-color)" }} />}
          label="Write a note"
          onClick={onWriteNote}
        />
        <ActionCard
          icon={<HugeiconsIcon icon={Link01Icon} className="size-4" style={{ color: "var(--url-color)" }} />}
          label="Save a URL"
          onClick={onSaveUrl}
        />
        <ActionCard
          icon={<HugeiconsIcon icon={Pdf01Icon} className="size-4" style={{ color: "var(--pdf-color)" }} />}
          label="Upload PDF"
          onClick={onUploadPdf}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-bg-border bg-bg-elevated px-4 py-4 flex flex-col items-center gap-2.5 transition-all duration-200 hover:border-accent-border hover:shadow-sm"
    >
      {icon}
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </button>
  );
}

function greetingFor(name?: string | null) {
  const hour = new Date().getHours();
  const greet =
    hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${greet}, ${name.split(" ")[0]}` : `${greet}`;
}
