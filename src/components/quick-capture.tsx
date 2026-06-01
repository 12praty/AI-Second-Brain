"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, Link01Icon, FileUploadIcon, Cancel01Icon, Loading01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { useCapture } from "@/components/capture-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "note" | "url" | "pdf";

export function QuickCapture() {
  const { open, setOpen, initialTab } = useCapture();
  const [tab, setTab] = useState<Tab>(initialTab);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setNoteTitle("");
      setNoteContent("");
      setUrl("");
      setPdfFile(null);
      setDrag(false);
    } else {
      setTimeout(() => {
        if (tab === "note") noteRef.current?.focus();
        if (tab === "url") urlRef.current?.focus();
      }, 60);
    }
  }, [open, tab]);

  function refreshLists() {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    queryClient.invalidateQueries({ queryKey: ["item"] });
  }

  async function submit() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (tab === "note") {
        if (!noteContent.trim()) throw new Error("Write something first");
        await api.createNote({
          title: noteTitle.trim() || undefined,
          content: noteContent,
        });
        toast.success("Note saved · processing in background");
      } else if (tab === "url") {
        let normalized = url.trim();
        if (!normalized) throw new Error("Paste a URL first");
        if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
        await api.createUrl(normalized);
        toast.success("URL saved · extracting content…");
      } else {
        if (!pdfFile) throw new Error("Drop a PDF first");
        await api.uploadPdf(pdfFile);
        toast.success("PDF uploaded · extracting text…");
      }
      refreshLists();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 animate-fadeIn"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg card p-6 shadow-lg animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-serif text-xl text-text-primary">Quick Capture</h2>
            <p className="text-xs text-text-muted mt-1">
              Save anything to your second brain
            </p>
          </div>
          <button
            className="text-text-muted hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-bg-elevated min-w-[36px] min-h-[36px] grid place-items-center"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-bg-elevated mb-5">
          <TabBtn icon={<HugeiconsIcon icon={File01Icon} className="size-3.5" />} label="Note" active={tab === "note"} onClick={() => setTab("note")} />
          <TabBtn icon={<HugeiconsIcon icon={Link01Icon} className="size-3.5" />} label="URL" active={tab === "url"} onClick={() => setTab("url")} />
          <TabBtn icon={<HugeiconsIcon icon={FileUploadIcon} className="size-3.5" />} label="PDF" active={tab === "pdf"} onClick={() => setTab("pdf")} />
        </div>

        <div className="space-y-3 min-h-[160px]">
          {tab === "note" && (
            <>
              <input
                className="input"
                placeholder="Title (optional)"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                maxLength={200}
              />
              <textarea
                ref={noteRef}
                className="input min-h-[140px] resize-y leading-relaxed"
                placeholder="Type your note… markdown supported."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                maxLength={50_000}
              />
            </>
          )}

          {tab === "url" && (
            <>
              <input
                ref={urlRef}
                className="input"
                placeholder="example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  const v = url.trim();
                  if (v && !/^https?:\/\//i.test(v)) setUrl("https://" + v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) submit();
                }}
              />
              <p className="text-xs text-text-muted leading-relaxed">
                We&apos;ll fetch the page, extract the article, and index it for chat.
              </p>
            </>
          )}

          {tab === "pdf" && (
            <label
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200",
                drag
                  ? "border-accent bg-accent-subtle"
                  : "border-bg-border hover:border-accent-border hover:bg-bg-elevated"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setPdfFile(f);
              }}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPdfFile(f);
                }}
              />
              <div className="size-10 rounded-xl bg-bg-elevated flex items-center justify-center">
                <HugeiconsIcon icon={Upload04Icon} className="size-5 text-text-secondary" />
              </div>
              <div className="text-sm font-medium text-text-primary">
                {pdfFile ? pdfFile.name : "Drop PDF here or click to browse"}
              </div>
              <div className="text-xs text-text-muted">Max 15 MB</div>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-bg-border">
          <button className="btn-ghost h-10 text-xs min-w-[80px]" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary h-10 text-xs min-w-[100px]" onClick={submit} disabled={busy}>
            {busy ? <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 min-h-[36px]",
        active
          ? "bg-bg-card text-text-primary shadow-sm"
          : "text-text-muted hover:text-text-secondary"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
