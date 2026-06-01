"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain02Icon } from "@hugeicons/core-free-icons";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal error:", error);
  }, [error]);

  return (
    <html>
      <head>
        <style>{`
          :root {
            --accent: hsl(226, 62%, 58%);
            --accent-subtle: hsla(226, 62%, 58%, 0.08);
            --bg-base: hsl(240, 5%, 5%);
            --bg-card: hsl(240, 5%, 8%);
            --bg-border: hsla(0, 0%, 100%, 0.06);
            --text-primary: hsl(240, 5%, 94%);
            --text-secondary: hsl(240, 4%, 57%);
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
        `}</style>
      </head>
      <body style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        WebkitFontSmoothing: "antialiased",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "360px",
            textAlign: "center",
            padding: "32px",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-card)",
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <HugeiconsIcon icon={AiBrain02Icon} style={{ width: "20px", height: "20px" }} color="var(--accent)" />
            </div>
            <h1 style={{ fontSize: "15px", fontWeight: 500, marginBottom: "6px" }}>
              Critical error
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {error.message || "A fatal error occurred."}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                background: "var(--accent)",
                color: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
