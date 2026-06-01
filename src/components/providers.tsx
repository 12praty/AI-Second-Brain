"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { Toaster } from "sonner";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside Providers");
  return ctx;
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", t === "light");
  root.classList.toggle("dark", t !== "light");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    let stored: Theme | null = null;
    try { stored = localStorage.getItem("theme") as Theme | null; } catch {}
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const t = stored ?? (systemDark ? "dark" : "light");
    setThemeState(t);
    applyTheme(t);
  }, []);

  function persistTheme(t: Theme) {
    try { localStorage.setItem("theme", t); } catch {}
  }

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      applyTheme(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    persistTheme(t);
    applyTheme(t);
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
          {children}
        </ThemeContext.Provider>
        <Toaster
          theme={theme}
          position="top-right"
          duration={4000}
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
