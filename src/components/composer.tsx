"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
        return setDelivery({ kind: "rejected", reason: `Not saved: ${reason}.` });
      }
      if (res.status === 429) {
        setNotice("The AI allowance for this demo is used up. Browsing policies and asking staff still work.");
        done(); return;
      }
      if (res.status === 503) {
        setNotice("AI answers are turned off for this demo right now. You can still ask staff.");
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
    setDelivery({ kind: "idle" });
    setNotice("Starting a new question. If the earlier one did save, it will show up after a refresh.");
    ref.current?.focus();
  }

  function done() {
    setDelivery({ kind: "saved" });
    setText("");
    setSubmissionId(null);
    router.refresh();
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-stone-200/80 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      {notice && <p role="status" className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">{notice}</p>}
      {!aiAvailable && !notice && (
        <p className="mb-2 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          {aiEnabled ? "The AI allowance for this demo is used up." : "AI answers are turned off for this demo right now."} Policies and staff messaging still work.
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(aiAvailable ? "ask" : "staff"); }} className="card p-2 transition focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/30" aria-labelledby="ask">
        <label htmlFor="question" id="ask" className="sr-only">Ask the AI assistant or send a message to school staff</label>
        <textarea
          id="question" ref={ref} name="question" value={text} rows={2} disabled={busy || unconfirmed} maxLength={maxChars * 2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (shouldSendOnEnter(keyFacts(e))) { e.preventDefault(); void send(aiAvailable ? "ask" : "staff"); } }}
          placeholder={aiAvailable ? "Ask the AI assistant about hours, closures, illness, meals…" : "Write a message for school staff"}
          className="w-full resize-none bg-transparent px-2 py-1.5 text-base leading-relaxed placeholder:text-stone-400 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span>{text.trim().length}/{maxChars}</span>
            <span className="hidden sm:inline" aria-hidden>Enter sends · Shift+Enter for a new line</span>
            <span aria-label="AI answers used this session" title="Routine questions are answered by AI, up to a per-demo allowance.">
              AI {Math.min(usage.sessionUsed, usage.sessionLimit)}/{usage.sessionLimit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unconfirmed && (
              <button type="button" onClick={editInstead} className="btn-link">Edit instead</button>
            )}
            {aiAvailable && !unconfirmed && (
              <button type="button" onClick={() => send("staff")} disabled={busy} className="btn-link">Send to school staff</button>
            )}
            <button type="submit" disabled={busy} className={aiAvailable ? "btn-brand" : "btn-primary"}>
              {busy ? "Sending…" : delivery.kind === "unconfirmed" ? "Retry" : aiAvailable ? "Ask AI" : "Send to school staff"}
            </button>
          </div>
        </div>
      </form>
      <div className="mt-1.5 min-h-5 px-1"><DeliveryStatus delivery={delivery} /></div>
    </div>
  );
}
