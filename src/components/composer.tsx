"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { UsageSnapshot } from "@/lib/usage";
import { DeliveryStatus, type Delivery } from "./delivery-status";
import { keyFacts, shouldSendOnEnter } from "@/lib/compose-keys";

type Mode = "ask" | "staff";

// One composer, two destinations, each named on its button. "Ask AI" asks the assistant (counted
// against the allowance). "Ask staff" saves a staff request directly and is
// never counted. Delivery state is about the save, not about staff progress.
export function Composer({ maxChars, usage, aiEnabled }: { maxChars: number; usage: UsageSnapshot; aiEnabled: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  // Optimistic turn (issue 013): the parent's message and a recipient-specific
  // indicator render immediately; the saved turn replaces them after refresh.
  const [pending, setPending] = useState<{ text: string; mode: Mode } | null>(null);
  const [refreshing, startRefresh] = useTransition();
  // Shown until the saved turn is on screen: while saving, while unconfirmed,
  // and while the post-save refresh is still in flight.
  const showPending = pending !== null && (delivery.kind === "saving" || delivery.kind === "unconfirmed" || refreshing);
  const ref = useRef<HTMLTextAreaElement>(null);

  const exhausted = usage.sessionUsed >= usage.sessionLimit || usage.dailyUsed >= usage.dailyLimit;
  const aiAvailable = aiEnabled && !exhausted;
  const busy = delivery.kind === "saving";
  // While a save is unconfirmed the text is locked to the submission id that
  // may already be saved: Retry replays it; Edit instead starts a new one.
  const unconfirmed = delivery.kind === "unconfirmed";

  async function send(mode: Mode) {
    const trimmed = text.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a question first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    const id = submissionId ?? crypto.randomUUID(); // stable across retries → one question saved
    setSubmissionId(id);
    setDelivery({ kind: "saving" });
    setNotice(null);
    setPending({ text: trimmed, mode });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), mode === "ask" ? 30000 : 10000);
    try {
      const res = await fetch(mode === "ask" ? "/api/ask" : "/api/requests", {
        method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ submissionId: id, question: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400) {
        const reason = typeof data?.error === "string" ? data.error : data?.error?.reason ?? "not accepted";
        setPending(null);
        return setDelivery({ kind: "rejected", reason: `Not saved: ${reason}.` });
      }
      if (res.status === 429) {
        setNotice("The AI allowance for this demo is used up. Browsing policies and asking staff still work.");
        done(); return;
      }
      if (res.status === 503) {
        setNotice("AI answers are turned off for this demo right now. You can still ask staff.");
        setPending(null);
        return setDelivery({ kind: "idle" });
      }
      if (res.ok) { done(); return; }
      setDelivery({ kind: "unconfirmed" });
    } catch {
      setDelivery({ kind: "unconfirmed" });
    } finally {
      clearTimeout(timer);
    }
  }

  function editInstead() {
    setSubmissionId(null);
    setPending(null);
    setDelivery({ kind: "idle" });
    setNotice("Starting a new question. If the earlier one did save, it will show up after a refresh.");
    ref.current?.focus();
  }

  function done() {
    setDelivery({ kind: "saved" });
    setText("");
    setSubmissionId(null);
    startRefresh(() => router.refresh()); // the optimistic turn stays until this settles
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-4 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {showPending && pending && <PendingTurn text={pending.text} mode={pending.mode} unconfirmed={unconfirmed} />}
      {notice && <p role="status" className="mb-2 rounded-2xl bg-person-soft px-3.5 py-2 text-sm text-person-deep">{notice}</p>}
      {!aiAvailable && !notice && (
        <p className="mb-2 rounded-2xl bg-surface px-3.5 py-2 text-sm text-ink-2 ring-1 ring-line">
          {aiEnabled ? "The AI allowance for this demo is used up." : "AI answers are turned off for this demo right now."} Policies and staff messaging still work.
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(aiAvailable ? "ask" : "staff"); }} aria-labelledby="ask"
        className="flex items-end gap-2 rounded-[26px] border border-line bg-surface py-1.5 pl-4 pr-1.5 shadow-float transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
        <label htmlFor="question" id="ask" className="sr-only">Ask the AI assistant or send a message to school staff</label>
        <textarea
          id="question" ref={ref} name="question" value={text} rows={1} disabled={busy || unconfirmed} maxLength={maxChars * 2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (shouldSendOnEnter(keyFacts(e))) { e.preventDefault(); void send(aiAvailable ? "ask" : "staff"); } }}
          placeholder={aiAvailable ? "Ask about hours, illness, meals…" : "Write a message for school staff"}
          className="max-h-32 min-h-10 w-full resize-none bg-transparent py-2 text-base leading-relaxed placeholder:text-ink-3 focus:outline-none"
        />
        {unconfirmed ? (
          <button type="button" onClick={editInstead} className="btn-link mb-0.5 mr-2">Edit instead</button>
        ) : aiAvailable ? (
          <button type="submit" disabled={busy} aria-label={busy ? "Sending" : "Ask AI"} title="Ask AI"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink-2 disabled:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
          </button>
        ) : (
          <button type="submit" disabled={busy} className="btn-person mb-0 h-10 min-h-0">{busy ? "Sending…" : "Send to school staff"}</button>
        )}
        {unconfirmed && <button type="submit" disabled={busy} className="btn-primary h-10 min-h-0">Retry</button>}
      </form>
      <div className="mt-1.5 flex items-center justify-between gap-3 px-3 text-xs text-ink-3">
        <span>
          <span aria-label="AI answers used this session" title="Routine questions are answered by AI, up to a per-demo allowance.">AI answers · {Math.min(usage.sessionUsed, usage.sessionLimit)} of {usage.sessionLimit} used</span>
          <span className="hidden sm:inline"> · {text.trim().length}/{maxChars} · Enter sends, Shift+Enter for a new line</span>
        </span>
        {aiAvailable && !unconfirmed && (
          <button type="button" onClick={() => send("staff")} disabled={busy} className="btn-link min-h-9 font-medium text-ink">Message staff instead</button>
        )}
      </div>
      <DeliveryStatus delivery={delivery} />
    </div>
  );
}

// The optimistic turn: the parent's bubble plus who is handling it. Copy names
// the recipient and never claims a person is reading it now.
function PendingTurn({ text, mode, unconfirmed }: { text: string; mode: Mode; unconfirmed: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3" data-pending={mode} aria-live="polite">
      <div className="rise flex justify-end">
        <div className="max-w-[82%] rounded-[20px] rounded-br-md bg-ink px-4 py-3 text-base leading-[1.4] text-white"><p className="whitespace-pre-wrap">{text}</p></div>
      </div>
      <div className="rise-late flex max-w-[92%] flex-col gap-2.5">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          {!unconfirmed && <span aria-hidden className="inline-flex items-center gap-1"><span className="pulse-dot" /><span className="pulse-dot" /><span className="pulse-dot" /></span>}
          <span className="font-medium text-ink">
            {unconfirmed ? "Not confirmed yet" : mode === "ask" ? "AI assistant is reading the policies" : "Saving your message for school staff"}
          </span>
        </div>
        {!unconfirmed && (
          <div className="flex flex-col gap-2" aria-hidden>
            <div className="skeleton h-3.5 w-[92%]" /><div className="skeleton h-3.5 w-[78%]" /><div className="skeleton h-3.5 w-[48%]" />
          </div>
        )}
        <p className="text-xs text-ink-3">
          {unconfirmed ? "Retry sends the same message once; Edit instead starts a new one." : mode === "ask" ? "Usually a few seconds. Your question is saved either way." : "Staff read messages during office hours."}
        </p>
      </div>
    </div>
  );
}
