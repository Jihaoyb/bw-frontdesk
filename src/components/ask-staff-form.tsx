"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Phase =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

// Delivery state (saving / saved / unconfirmed) is separate from staff
// progress. "Saved" is shown only after the server confirmed persistence.
export function AskStaffForm({ maxChars }: { maxChars: number }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setPhase({ kind: "rejected", reason: "Type a question first." });
      return;
    }
    if (trimmed.length > maxChars) {
      setPhase({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
      return;
    }
    // Stable identity: a retry after a lost response reuses it, so the server creates one request.
    const id = submissionId ?? crypto.randomUUID();
    setSubmissionId(id);
    setPhase({ kind: "saving" });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: id, question: trimmed }),
        signal: ctrl.signal,
      });
      if (res.status === 201 || res.status === 200) {
        setPhase({ kind: "saved" });
        setQuestion("");
        setSubmissionId(null);
        router.refresh();
        return;
      }
      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        const reason = typeof data?.error === "string" ? data.error : data?.error?.reason ?? "not accepted";
        setPhase({ kind: "rejected", reason: `Not saved: ${reason}.` });
        return;
      }
      setPhase({ kind: "unconfirmed" });
    } catch {
      setPhase({ kind: "unconfirmed" });
    } finally {
      clearTimeout(timer);
    }
  }

  const busy = phase.kind === "saving";
  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-200 bg-white p-4" aria-labelledby="ask">
      <label htmlFor="question" id="ask" className="text-sm font-semibold">Ask the front desk</label>
      <textarea
        id="question"
        name="question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={maxChars * 2}
        rows={3}
        disabled={busy}
        placeholder="Type your question"
        className="mt-2 w-full rounded-md border border-stone-300 p-2 text-base"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Saving…" : phase.kind === "unconfirmed" ? "Retry Ask staff" : "Ask staff"}
        </button>
        <span className="text-xs text-stone-500">{question.trim().length}/{maxChars}</span>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {phase.kind === "saved" && <span className="text-green-800">Saved. Your request is in the staff inbox.</span>}
        {phase.kind === "rejected" && <span className="text-red-800">{phase.reason}</span>}
        {phase.kind === "unconfirmed" && (
          <span className="text-amber-800">We could not confirm this was saved. Your text is kept. Retry sends the same request once, not twice.</span>
        )}
      </p>
    </form>
  );
}
