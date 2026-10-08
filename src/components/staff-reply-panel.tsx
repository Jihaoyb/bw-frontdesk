"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markReviewingAction, openKnowledgeDraftAction, reopenRequestAction, staffReplyAction } from "@/app/actions";
import type { RequestStatus, StaffReplyOutcome } from "@/lib/requests";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Explicit staff actions. Opening the request page records nothing; only the
// buttons here change progress. One primary Send with a resolution choice; the
// knowledge draft is a separate action. Close has no confirmation modal; Reopen is the undo.

const resolutionOptions: { value: StaffReplyOutcome; label: string }[] = [
  { value: "reply", label: "Keep open" },
  { value: "needs_your_reply", label: "Ask the family to reply" },
  { value: "close", label: "Close the request" },
];
const resolutionHelp: Record<StaffReplyOutcome, string> = {
  reply: "Marks it as staff reviewing. Nothing is published and the request stays open.",
  needs_your_reply: "Shows the family \"Needs your reply\". Their reply reopens review.",
  close: "Marks it closed for the family. Reopen is always available; closing publishes nothing.",
};
export function StaffReplyPanel({ requestId, status, staffNames, maxChars, canDraft }: {
  requestId: string; status: RequestStatus; staffNames: readonly string[]; maxChars: number; canDraft: boolean;
}) {
  const router = useRouter();
  const [staffName, setStaffName] = useState(staffNames[0] ?? "");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<StaffReplyOutcome>("reply");
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const [submissionId, setSubmissionId] = useState<string | null>(null); // stable across retries → one message
  const busy = delivery.kind === "saving";
  const closed = status === "closed";

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, clear = false) {
    const result = await deliver(action, setDelivery);
    if (result?.ok) { if (clear) { setBody(""); setSubmissionId(null); } router.refresh(); }
  }
  function attemptId() {
    const id = submissionId ?? crypto.randomUUID();
    setSubmissionId(id);
    return id;
  }

  function send(outcome: StaffReplyOutcome) {
    const trimmed = body.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a reply first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    const id = attemptId();
    return run(() => staffReplyAction(requestId, { staffName, body: trimmed, outcome, submissionId: id }), true);
  }

  // Issue 007: send the reply, then open a knowledge draft seeded with it. Two
  // independent saves; the second publishes nothing. If the reply saved but the
  // draft did not, the delivery line says so and the reply is already sent.
  async function sendAndDraft() {
    const trimmed = body.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a reply first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    const id = attemptId();
    const sent = await deliver(() => staffReplyAction(requestId, { staffName, body: trimmed, outcome: "reply", submissionId: id }), setDelivery);
    if (!sent?.ok) return;
    setBody("");
    setSubmissionId(null);
    const opened = await openKnowledgeDraftAction(requestId, trimmed);
    if (!opened.ok) return setDelivery({ kind: "rejected", reason: `Reply sent. ${opened.error}` });
    router.push(opened.href);
  }

  return (
    <section aria-labelledby="staff-actions" className="sheet card flex flex-col gap-3 p-4 text-sm lg:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="staff-actions" className="text-base font-semibold tracking-[-0.01em]">Reply as <span className="text-person-deep">{staffName}</span></h3>
        <div className="flex gap-2">
          {!closed && status !== "staff_reviewing" && (
            <button type="button" disabled={busy} onClick={() => run(() => markReviewingAction(requestId))} className="chip">Mark reviewing</button>
          )}
          {closed && (
            <button type="button" disabled={busy} onClick={() => run(() => reopenRequestAction(requestId))} className="chip">Reopen</button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Replying as</span>
          <select id="staff-name" value={staffName} onChange={(e) => setStaffName(e.target.value)} disabled={busy} className="field min-h-11 w-auto py-2">
            {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Message</span>
          <textarea id="staff-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} disabled={busy} maxLength={maxChars * 2}
            placeholder="Write to this family" className="field" />
          <span className="mono text-[11px] text-ink-3">{body.trim().length}/{maxChars} · goes to this family only; it does not change center policies</span>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow">After sending</legend>
        <div className="flex flex-wrap gap-2">
          {resolutionOptions.map((o) => (
            <label key={o.value} className={"chip cursor-pointer " + (outcome === o.value ? "chip-on" : "")}>
              <input type="radio" name="outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} disabled={busy} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-3" data-outcome-help={outcome}>{resolutionHelp[outcome]}</p>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send(outcome)} className="btn-person flex-1 sm:flex-none sm:px-6">Send reply</button>
        {canDraft && (
          <button type="button" disabled={busy} onClick={sendAndDraft} className="btn-ghost" data-action="send-and-draft">
            Send &amp; open knowledge draft
          </button>
        )}
      </div>
      <DeliveryStatus delivery={delivery} />
    </section>
  );
}
