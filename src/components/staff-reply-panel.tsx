"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markReviewingAction, reopenRequestAction, staffReplyAction } from "@/app/actions";
import type { RequestStatus, StaffReplyOutcome } from "@/lib/requests";
import { statusLabel } from "./request-card";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Explicit staff actions. Opening the request page records nothing; only the
// buttons here change progress. Close has no confirmation modal; Reopen is the undo.
export function StaffReplyPanel({ requestId, status, staffNames, maxChars }: {
  requestId: string; status: RequestStatus; staffNames: readonly string[]; maxChars: number;
}) {
  const router = useRouter();
  const [staffName, setStaffName] = useState(staffNames[0] ?? "");
  const [body, setBody] = useState("");
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const busy = delivery.kind === "saving";
  const closed = status === "closed";

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, clear = false) {
    const result = await deliver(action, setDelivery);
    if (result?.ok) { if (clear) setBody(""); router.refresh(); }
  }

  function send(outcome: StaffReplyOutcome) {
    const trimmed = body.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a reply first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    return run(() => staffReplyAction(requestId, { staffName, body: trimmed, outcome }), true);
  }

  const btn = "rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <section aria-labelledby="staff-actions" className="rounded-lg border border-stone-300 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="staff-actions" className="font-semibold">Reply to the family</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs" data-status={status}>{statusLabel[status]}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!closed && status !== "staff_reviewing" && (
          <button type="button" disabled={busy} onClick={() => run(() => markReviewingAction(requestId))} className={btn + " border border-stone-300"}>
            Mark reviewing
          </button>
        )}
        {closed && (
          <button type="button" disabled={busy} onClick={() => run(() => reopenRequestAction(requestId))} className={btn + " border border-stone-300"}>
            Reopen
          </button>
        )}
      </div>
      <label htmlFor="staff-name" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Replying as</label>
      <select id="staff-name" value={staffName} onChange={(e) => setStaffName(e.target.value)} disabled={busy}
        className="mt-1 rounded-md border border-stone-300 p-2 text-base">
        {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <label htmlFor="staff-body" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Message</label>
      <textarea id="staff-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} disabled={busy} maxLength={maxChars * 2}
        placeholder="Write a reply to this family" className="mt-1 w-full rounded-md border border-stone-300 p-2 text-base" />
      <p className="mt-1 text-xs text-stone-500">{body.trim().length}/{maxChars}. This reply goes to this family only; it does not change center policies.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send("reply")} className={btn + " bg-stone-900 text-white"}>Send reply</button>
        <button type="button" disabled={busy} onClick={() => send("needs_your_reply")} className={btn + " border border-stone-300"}>Send as Needs your reply</button>
        <button type="button" disabled={busy} onClick={() => send("close")} className={btn + " border border-stone-300"}>Send &amp; close</button>
      </div>
      <div className="mt-2"><DeliveryStatus delivery={delivery} /></div>
    </section>
  );
}
