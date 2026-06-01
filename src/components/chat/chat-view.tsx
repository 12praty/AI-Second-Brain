"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  AiBrain02Icon,
  Loading01Icon,
  Message01Icon,
  Add01Icon,
  SparklesIcon,
  Delete01Icon,
  File01Icon,
  Link01Icon,
  Pdf01Icon,
  ArrowUpRight02Icon,
} from "@hugeicons/core-free-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type ChatRow, type MessageRow } from "@/lib/api";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

const TYPE_META = {
  NOTE: { icon: File01Icon, color: "var(--note-color)" },
  URL: { icon: Link01Icon, color: "var(--url-color)" },
  PDF: { icon: Pdf01Icon, color: "var(--pdf-color)" },
} as const;

type Source = {
  itemId: string;
  title: string;
  excerpt: string;
  type: "NOTE" | "URL" | "PDF";
  sourceUrl?: string | null;
};

type StreamingState = {
  text: string;
  sources: Source[];
  stage: "idle" | "searching" | "thinking" | "writing" | "done" | "error";
  error?: string;
};

const EMPTY_STATE: StreamingState = {
  text: "",
  sources: [],
  stage: "idle",
};

export function ChatView({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const prefill = searchParams.get("prefill") ?? searchParams.get("q") ?? "";

  const abortRef = useRef<AbortController | null>(null);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialChatId ?? null
  );
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<StreamingState>(EMPTY_STATE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: api.listChats,
    refetchOnWindowFocus: true,
  });
  const chats = chatsData?.chats ?? [];

  const { data: currentChat } = useQuery({
    queryKey: ["chat", activeChatId],
    queryFn: () => api.getChat(activeChatId!),
    enabled: !!activeChatId,
  });

  const createChat = useMutation({
    mutationFn: api.createChat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setActiveChatId(data.chat.id);
      router.push(`/chat/${data.chat.id}`);
    },
  });

  const deleteChat = useMutation({
    mutationFn: (id: string) => api.deleteChat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setActiveChatId(null);
      router.push("/chat");
      toast.success("Conversation deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    },
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [currentChat?.messages?.length, streaming.text, streaming.stage]);

  useEffect(() => {
    if (prefill && !draft) {
      setDraft(prefill);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  useEffect(() => {
    abortRef.current?.abort();
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    setActiveChatId(initialChatId ?? null);
    setStreaming(EMPTY_STATE);
  }, [initialChatId]);

  const sendMessage = useCallback(
    async (text: string, chatId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming({ text: "", sources: [], stage: "searching" });
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          signal: controller.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (!res.ok || !res.body) {
          const err = await res.text().catch(() => "");
          throw new Error(err || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const evt of events) {
            const lines = evt.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (!eventLine || !dataLine) continue;
            const eventName = eventLine.slice(6).trim();
            const dataStr = dataLine.slice(5).trim();
            let parsed: unknown;
            try {
              parsed = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (eventName === "status") {
              const d = parsed as { stage: string };
              setStreaming((s) => ({ ...s, stage: d.stage as StreamingState["stage"] }));
            } else if (eventName === "sources") {
              const d = parsed as { sources: Source[] };
              setStreaming((s) => ({ ...s, sources: d.sources ?? [] }));
            } else if (eventName === "delta") {
              const d = parsed as { text: string };
              setStreaming((s) => ({ ...s, stage: "writing", text: s.text + (d.text ?? "") }));
            } else if (eventName === "done") {
              setStreaming((s) => ({ ...s, stage: "done" }));
            } else if (eventName === "error") {
              const d = parsed as { error: string };
              setStreaming((s) => ({ ...s, stage: "error", error: d.error }));
              toast.error(d.error ?? "Stream failed");
            }
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Stream failed");
        setStreaming((s) => ({ ...s, stage: "error" }));
      } finally {
        queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        if (controller === abortRef.current) {
          streamTimeoutRef.current = setTimeout(() => {
            if (controller === abortRef.current && mountedRef.current) setStreaming(EMPTY_STATE);
          }, 600);
        }
      }
    },
    [queryClient]
  );

  async function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    if (streaming.stage !== "idle" && streaming.stage !== "done" && streaming.stage !== "error") return;

    setDraft("");
    let chatId = activeChatId;
    if (!chatId) {
      try {
        const { chat } = await api.createChat();
        chatId = chat.id;
        setActiveChatId(chat.id);
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        router.push(`/chat/${chat.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start chat");
        setDraft(text);
        return;
      }
    }
    queryClient.setQueryData<{ chat: ChatRow; messages: MessageRow[] }>(
      ["chat", chatId],
      (prev) => ({
        ...(prev ?? { chat: { id: chatId, title: "New chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, messages: [] }),
        messages: [
          ...(prev?.messages ?? []),
          {
            id: `temp-${Date.now()}`,
            role: "USER",
            content: text,
            sources: [],
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );

    await sendMessage(text, chatId);
  }

  const messages = currentChat?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen bg-bg-base">
      {/* Conversation sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-bg-border bg-bg-card">
        <div className="p-4 border-b border-bg-border">
          <button
            onClick={() => createChat.mutate()}
            disabled={createChat.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-all duration-200 shadow-sm min-h-[44px]"
          >
            {createChat.isPending ? <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" /> : <HugeiconsIcon icon={Add01Icon} className="size-3.5" />}
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {chats.length === 0 ? (
            <div className="text-center px-3 py-12 text-text-muted text-xs">
              <HugeiconsIcon icon={Message01Icon} className="size-5 mx-auto mb-2 opacity-40" />
              No conversations yet
            </div>
          ) : (
            chats.map((c) => {
              const active = c.id === activeChatId;
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveChatId(c.id);
                    router.push(`/chat/${c.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveChatId(c.id);
                      router.push(`/chat/${c.id}`);
                    }
                  }}
                  className={cn(
                    "group relative w-full text-left rounded-xl px-3.5 py-3 transition-all duration-200 flex flex-col gap-1 cursor-pointer min-h-[52px]",
                    active
                      ? "bg-accent-subtle"
                      : "text-text-secondary hover:bg-bg-elevated"
                  )}
                >
                  <span className={cn("text-sm font-medium truncate", active ? "text-accent" : "text-text-primary")}>
                    {truncate(c.title || "New chat", 36)}
                  </span>
                  <span className="text-xs text-text-muted">{formatRelativeTime(c.updatedAt)}</span>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all duration-200 p-2 grid place-items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) deleteChat.mutate(c.id);
                    }}
                    aria-label="Delete conversation"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && streaming.stage === "idle" ? (
              <EmptyChat onPick={(text) => setDraft(text)} />
            ) : (
              <div className="space-y-6">
                {messages.map((m, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showDivider = !prev || !sameDay(prev.createdAt, m.createdAt);
                  return (
                    <div key={m.id} className="space-y-3">
                      {showDivider && <DateDivider date={m.createdAt} />}
                      <MessageBubble message={m} />
                    </div>
                  );
                })}

                {streaming.stage !== "idle" && (
                  <LiveAnswer state={streaming} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-bg-border bg-bg-base px-4 md:px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 rounded-2xl border border-bg-border bg-bg-card px-4 py-3 transition-all duration-200 focus-within:border-accent-border focus-within:shadow-sm">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask anything about your knowledge base…"
                className="flex-1 bg-transparent resize-none px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-text-muted max-h-36 text-text-primary"
                disabled={streaming.stage !== "idle" && streaming.stage !== "done" && streaming.stage !== "error"}
              />
              <button
                onClick={handleSubmit}
                disabled={
                  !draft.trim() ||
                  (streaming.stage !== "idle" && streaming.stage !== "done" && streaming.stage !== "error")
                }
                className="size-10 rounded-xl bg-accent text-white grid place-items-center shrink-0 hover:bg-accent-hover transition-all duration-200 disabled:opacity-40 shadow-sm"
                aria-label="Send"
              >
                {streaming.stage !== "idle" && streaming.stage !== "done" && streaming.stage !== "error" ? (
                  <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin" />
                ) : (
                  <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
                )}
              </button>
            </div>
            <div className="text-xs text-text-muted mt-2 text-center">
              Enter to send · Shift + Enter for newline
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ onPick }: { onPick: (text: string) => void }) {
  const examples = [
    "What have I saved about productivity?",
    "Summarise my notes about React",
    "Find everything about learning",
  ];
  return (
    <div className="flex flex-col items-center text-center pt-16 pb-8">
      <div className="size-14 rounded-2xl bg-accent-subtle flex items-center justify-center mb-5">
        <HugeiconsIcon icon={AiBrain02Icon} className="size-7 text-accent" />
      </div>
      <h2 className="font-serif text-2xl mb-2 text-text-primary">Ask your second brain</h2>
      <p className="text-sm text-text-secondary mb-8 max-w-md leading-relaxed">
        I&apos;ll search across all your saved notes, articles, and PDFs to answer your question — with citations.
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5 max-w-lg w-full">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => onPick(ex)}
            className="card-hover text-left py-3 px-4 text-xs text-text-secondary hover:text-text-primary transition-colors flex-1 rounded-xl"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function DateDivider({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const label = isToday ? "Today" : isYesterday ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-bg-border" />
      <span className="text-xs text-text-muted font-medium uppercase tracking-wider shrink-0">{label}</span>
      <div className="flex-1 h-px bg-bg-border" />
    </div>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex animate-messageIn", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-accent text-white rounded-2xl rounded-br-md"
              : "bg-bg-card border border-bg-border text-text-primary rounded-2xl rounded-bl-md"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveAnswer({ state }: { state: StreamingState }) {
  const stageText = useMemo(() => {
    if (state.stage === "searching") return "Searching your knowledge base…";
    if (state.stage === "thinking") {
      const n = state.sources.length;
      return n > 0
        ? `Found ${n} relevant ${n === 1 ? "source" : "sources"} — generating…`
        : "Thinking…";
    }
    return "";
  }, [state.stage, state.sources.length]);

  return (
    <div className="flex justify-start animate-messageIn">
      <div className="max-w-[80%] flex flex-col gap-1.5 items-start">
        <div className="bg-bg-card border border-bg-border rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed text-text-primary min-w-[200px]">
          {state.text ? (
            <div className={cn("markdown-body", state.stage === "writing" ? "streaming-cursor" : "")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {state.text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary">
              <HugeiconsIcon icon={SparklesIcon} className="size-4 text-accent animate-pulse" />
              <span className="text-xs">{stageText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
