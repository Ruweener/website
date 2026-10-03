"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, Square, X } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string; failed?: boolean };

const SUGGESTIONS = [
  "What does the P in COSC 1P02 mean?",
  "How many context credits do I need?",
  "Can CS students take the Applied Computing minor?",
  "Where can I get help with a COSC course?",
];

/** Only the turns the API accepts, newest last, ending on the new question. */
const historyFor = (turns: Turn[]) =>
  turns
    .filter((t) => !t.failed && t.content.trim())
    .slice(-11)
    .map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));

export default function GuideChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"demo" | "live" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped by "New chat" so a still-running answer can't write into it.
  const chatRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    const chat = chatRef.current;
    const updateLast = (patch: Partial<Turn>) =>
      setTurns((prev) =>
        chatRef.current !== chat || prev.length === 0
          ? prev
          : [...prev.slice(0, -1), { ...prev[prev.length - 1], ...patch }],
      );
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);

    const ctl = new AbortController();
    abortRef.current = ctl;
    let answer = "";
    try {
      const res = await fetch("/api/cs-guide/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: historyFor(next) }),
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        updateLast({
          failed: true,
          content:
            res.status === 429
              ? "You've asked a lot of questions in a short time. Please wait a bit and try again."
              : "Sorry, that didn't work. Please try again.",
        });
        return;
      }
      setMode(res.headers.get("x-chat-mode") === "live" ? "live" : "demo");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        updateLast({ content: answer });
      }
    } catch {
      updateLast(
        ctl.signal.aborted
          ? { content: answer ? `${answer} …` : "Stopped.", failed: !answer }
          : {
              content: "Couldn't reach the server. Please try again.",
              failed: true,
            },
      );
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    chatRef.current += 1;
    abortRef.current?.abort();
    setTurns([]);
    inputRef.current?.focus();
  };

  // Below lg the panel covers the guide, so jumping to a section closes it.
  const onAnchor = () => {
    if (!window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-brand px-5 font-semibold text-brand-ink shadow-brut-sm"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Ask the guide
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Ask the CS guide"
          className="animate-pop-in fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border-2 border-line bg-surface shadow-brut sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
        >
          <header className="flex items-center gap-2 border-b-2 border-line bg-raised px-4 py-3">
            <MessageCircle className="size-5 text-brand" aria-hidden="true" />
            <h2 className="font-bold">Ask the guide</h2>
            {mode && (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  mode === "live"
                    ? "border-green-600 text-green-700 dark:text-green-300"
                    : "border-yellow-600 text-yellow-700 dark:text-yellow-300"
                }`}
                title={
                  mode === "live"
                    ? "Answers are written by Claude"
                    : "No API key set: answers quote the guide"
                }
              >
                {mode === "live" ? "Live" : "Demo"}
              </span>
            )}
            <span className="flex-1" />
            {turns.length > 0 && (
              <IconButton label="New chat" onClick={reset}>
                <RotateCcw className="size-4" />
              </IconButton>
            )}
            <IconButton label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </IconButton>
          </header>

          <div
            ref={listRef}
            data-scroll-allow
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {turns.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-subtle">
                  Ask anything covered in this guide: course codes,
                  registration, context credits, requirements or resources.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="press-flat rounded-xl border-2 border-line px-3 py-2 text-left text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn, i) =>
                turn.role === "user" ? (
                  <div
                    key={i}
                    className="ml-8 rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-brand-ink"
                  >
                    {turn.content}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`mr-4 rounded-2xl rounded-bl-sm border-2 px-3 py-2 text-sm ${
                      turn.failed
                        ? "border-yellow-500 text-subtle"
                        : "border-line/20"
                    }`}
                  >
                    {turn.content ? (
                      <Markdown text={turn.content} onAnchor={onAnchor} />
                    ) : (
                      <span className="text-subtle">Thinking…</span>
                    )}
                  </div>
                ),
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
            className="border-t-2 border-line px-3 pt-3 pb-2"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                placeholder="Ask a question…"
                aria-label="Your question"
                className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 text-base sm:text-sm"
              />
              {busy ? (
                <IconButton
                  label="Stop"
                  onClick={() => abortRef.current?.abort()}
                  solid
                >
                  <Square className="size-4" />
                </IconButton>
              ) : (
                <IconButton
                  label="Send"
                  type="submit"
                  disabled={!draft.trim()}
                  solid
                >
                  <Send className="size-4" />
                </IconButton>
              )}
            </div>
            <p className="mt-2 text-xs text-subtle">
              Answers can be wrong. Always check the{" "}
              <a
                className="underline"
                href="https://calendar.brocku.ca/"
                target="_blank"
                rel="noreferrer"
              >
                official calendar
              </a>
              .
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function IconButton({
  label,
  solid = false,
  type = "button",
  children,
  ...rest
}: {
  label: string;
  solid?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid size-11 shrink-0 place-items-center rounded-xl disabled:opacity-40 ${
        solid
          ? "press border-2 border-line bg-brand text-brand-ink shadow-brut-sm"
          : "press-flat"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- MINIMAL MARKDOWN: paragraphs, "- " bullets, **bold**, _em_, links ---------- */

const INLINE =
  /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+[^\s).,;:])/g;

const safeHref = (href: string) =>
  href.startsWith("#") || /^https?:\/\//.test(href) ? href : null;

function Inline({ text, onAnchor }: { text: string; onAnchor: () => void }) {
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        const link =
          /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part) ??
          (/^https?:\/\//.test(part) ? [part, part, part] : null);
        const href = link && safeHref(link[2]);
        if (link && href) {
          const local = href.startsWith("#");
          return (
            <a
              key={i}
              href={href}
              className="font-medium text-brand underline hover:decoration-2"
              {...(local
                ? { onClick: onAnchor }
                : { target: "_blank", rel: "noreferrer" })}
            >
              {link[1]}
            </a>
          );
        }
        return <React.Fragment key={i}>{link ? link[1] : part}</React.Fragment>;
      })}
    </>
  );
}

function Markdown({ text, onAnchor }: { text: string; onAnchor: () => void }) {
  return (
    <div className="space-y-2 [overflow-wrap:anywhere]">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline
                    text={l.replace(/^\s*[-*] /, "")}
                    onAnchor={onAnchor}
                  />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            <Inline text={block} onAnchor={onAnchor} />
          </p>
        );
      })}
    </div>
  );
}
