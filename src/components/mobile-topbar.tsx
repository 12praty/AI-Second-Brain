"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain02Icon, Add01Icon, Home01Icon, Message01Icon, LibraryIcon, Search01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { useCapture } from "@/components/capture-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home01Icon, exact: true },
  { href: "/chat", label: "Chat", icon: Message01Icon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/search", label: "Search", icon: Search01Icon },
];

export function MobileTopbar() {
  const { openWith } = useCapture();
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-12 border-b border-bg-border bg-bg-card/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]">
          <div className="size-7 rounded-lg bg-accent flex items-center justify-center">
            <HugeiconsIcon icon={AiBrain02Icon} className="size-3.5 text-white" />
          </div>
          <span className="font-medium text-sm text-text-primary">Second Brain</span>
        </Link>
        <button
          onClick={() => openWith("note")}
          className="inline-flex items-center justify-center gap-2 rounded-lg h-10 px-3 text-xs font-medium bg-accent text-white min-w-[44px]"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
        </button>
      </header>
      <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-4 border-t border-bg-border bg-bg-card/80 backdrop-blur-md">
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
                "flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors min-h-[48px]",
                active ? "text-accent" : "text-text-muted"
              )}
            >
              <HugeiconsIcon icon={Icon} className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
