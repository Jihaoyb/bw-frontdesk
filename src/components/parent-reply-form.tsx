"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parentReplyAction } from "@/app/actions";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Parent adds details under a request. If the request was closed, the server
// reopens it; the progress label updates after refresh, not from this form.
export function ParentReplyForm({ requestId, maxChars, closed }: { requestId: string; maxChars: number; closed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const busy = delivery.kind === "saving";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a message first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    const result = await deliver(() => parentReplyAction(requestId, trimmed), setDelivery);
    if (result?.ok) { setBody(""); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-200 bg-white p-3" aria-label="Reply to staff on this request">
      <label htmlFor={`reply-${requestId}`} className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {closed ? "Add to this request (reopens it)" : "Add details for staff"}
      </label>
      <textarea
        id={`reply-${requestId}`} value={body} onChange={(e) => setBody(e.target.value)} rows={2} disabled={busy}
        maxLength={maxChars * 2} placeholder="Add details or a follow-up question"
        className="mt-2 w-full rounded-md border border-stone-300 p-2 text-base"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {closed ? "Reply and reopen" : "Send to staff"}
        </button>
        <DeliveryStatus delivery={delivery} />
      </div>
    </form>
  );
}
