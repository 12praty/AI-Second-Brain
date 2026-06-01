"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain02Icon,
  Home01Icon,
  Message01Icon,
  LibraryIcon,
  Search01Icon,
  Tag01Icon,
  Add01Icon,
  Sun01Icon,
  Moon02Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { cn, formatBytes } from "@/lib/utils";
import { useCapture } from "@/components/capture-context";
import { useTheme } from "@/components/providers";
import { api } from "@/lib/api";

const NAV = [
  { href: "/", label: "Home", icon: Home01Icon, exact: true },
  { href: "/chat", label: "Chat", icon: Message01Icon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/search", label: "Search", icon: Search01Icon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openWith } = useCapture();
  const { theme, toggleTheme } = useTheme();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.stats,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const totalItems = stats?.total ?? 0;

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col h-screen sticky top-0 border-r border-bg-border bg-bg-base">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <HugeiconsIcon icon={AiBrain02Icon} className="size-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium leading-none text-text-primary">Second Brain</div>
            <div className="text-xs text-text-muted mt-0.5">knowledge OS</div>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-5">
        <button
          onClick={() => openWith("note")}
          className="group w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-all duration-200 shadow-sm min-h-[44px]"
        >
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={Add01Icon} className="size-3.5 group-hover:rotate-45 transition-transform duration-300" />
            Capture
          </span>
          <kbd className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-mono bg-white/15 text-white/70">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 min-h-[44px]",
                active
                  ? "bg-accent-subtle text-accent font-medium"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              )}
            >
              <HugeiconsIcon icon={Icon} className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-bg-border space-y-4">
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>{totalItems} items</span>
            <span>{formatBytes(stats?.bytes ?? 0)}</span>
          </div>
          <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(2, (totalItems / 100) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-xl bg-bg-elevated flex items-center justify-center text-xs font-medium text-text-secondary shrink-0 ring-1 ring-bg-border">
              {(session?.user?.name ?? session?.user?.email ?? "U")
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate text-text-primary">
                {session?.user?.name ?? "You"}
              </div>
              <div className="text-xs text-text-muted truncate">
                {session?.user?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="text-text-muted hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-bg-elevated min-w-[36px] min-h-[36px] grid place-items-center"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <HugeiconsIcon icon={Sun01Icon} className="size-3.5" /> : <HugeiconsIcon icon={Moon02Icon} className="size-3.5" />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-text-muted hover:text-error transition-colors p-2 rounded-lg hover:bg-bg-elevated min-w-[36px] min-h-[36px] grid place-items-center"
              aria-label="Sign out"
            >
              <HugeiconsIcon icon={Logout01Icon} className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
