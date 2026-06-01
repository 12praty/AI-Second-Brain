"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain02Icon, Refresh01Icon, Home01Icon } from "@hugeicons/core-free-icons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 text-center max-w-sm">
        <div className="size-10 rounded-xl bg-accent-subtle flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={AiBrain02Icon} className="size-5 text-accent" />
        </div>
        <h1 className="font-medium text-base mb-1">Something went wrong</h1>
        <p className="text-xs text-text-secondary mb-5">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <button onClick={reset} className="btn-primary h-9 text-xs">
            <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" /> Try again
          </button>
          <Link href="/" className="btn-secondary h-9 text-xs">
            <HugeiconsIcon icon={Home01Icon} className="size-3.5" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
