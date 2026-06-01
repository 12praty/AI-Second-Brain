"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type CaptureContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialTab: "note" | "url" | "pdf";
  openWith: (tab?: "note" | "url" | "pdf") => void;
};

const CaptureContext = createContext<CaptureContextType | null>(null);

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"note" | "url" | "pdf">("note");

  const openWith = useCallback((tab?: "note" | "url" | "pdf") => {
    if (tab) setInitialTab(tab);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CaptureContext.Provider value={{ open, setOpen, initialTab, openWith }}>
      {children}
    </CaptureContext.Provider>
  );
}

export function useCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCapture must be used inside CaptureProvider");
  return ctx;
}
