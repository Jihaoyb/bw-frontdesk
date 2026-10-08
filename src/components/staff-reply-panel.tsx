"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markReviewingAction, openKnowledgeDraftAction, reopenRequestAction, staffReplyAction } from "@/app/actions";
import type { RequestStatus, StaffReplyOutcome } from "@/lib/requests";
import { StatusPill } from "./request-card";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Explicit staff actions. Opening the request page records nothing; only the
// buttons here change progress. Close has no confirmation modal; Reopen is the undo.
export function StaffReplyPanel({ requestId, status, staffNames, maxChars, canDraft }: {
  requestId: string; status: RequestStatus; staffNames: readonly string[]; maxChars: number; canDraft: boolean;
}) {
  const router = useRouter();
  const [staffName, setStaffName] = useState(staffNames[0] ?? "");
  const [body, setBody] = useState("");
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
    <section aria-labelledby="staff-actions" className="card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="staff-actions" className="text-base font-semibold tracking-tight">Reply to the family</h3>
        <StatusPill status={status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!closed && status !== "staff_reviewing" && (
          <button type="button" disabled={busy} onClick={() => run(() => markReviewingAction(requestId))} className="btn-ghost">
            Mark reviewing
          </button>
        )}
        {closed && (
          <button type="button" disabled={busy} onClick={() => run(() => reopenRequestAction(requestId))} className="btn-ghost">
            Reopen
          </button>
        )}
      </div>
      <label htmlFor="staff-name" className="eyebrow mt-4 block">Replying as</label>
      <select id="staff-name" value={staffName} onChange={(e) => setStaffName(e.target.value)} disabled={busy}
        className="field mt-1 w-auto py-2">
        {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <label htmlFor="staff-body" className="eyebrow mt-3 block">Message</label>
      <textarea id="staff-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} disabled={busy} maxLength={maxChars * 2}
        placeholder="Write a reply to this family" className="field mt-1" />
      <p className="mt-1 text-xs text-stone-500">{body.trim().length}/{maxChars}. This reply goes to this family only; it does not change center policies or close the request. A knowledge draft is reviewed and published separately.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send("reply")} className="btn-primary">Send reply</button>
        <button type="button" disabled={busy} onClick={() => send("needs_your_reply")} className="btn-ghost">Send as Needs your reply</button>
        <button type="button" disabled={busy} onClick={() => send("close")} className="btn-ghost">Send &amp; close</button>
        {canDraft && (
          <button type="button" disabled={busy} onClick={sendAndDraft} className="btn-ghost" data-action="send-and-draft">
            Send &amp; open knowledge draft
          </button>
        )}
      </div>
      <div className="mt-2"><DeliveryStatus delivery={delivery} /></div>
    </section>
  );
}
