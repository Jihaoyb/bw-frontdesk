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
  const [submissionId, setSubmissionId] = useState<string | null>(null); // stable across retries → one message
  const busy = delivery.kind === "saving";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return setDelivery({ kind: "rejected", reason: "Type a message first." });
    if (trimmed.length > maxChars) return setDelivery({ kind: "rejected", reason: `Keep it under ${maxChars} characters.` });
    const id = submissionId ?? crypto.randomUUID();
    setSubmissionId(id);
    const result = await deliver(() => parentReplyAction(requestId, trimmed, id), setDelivery);
    if (result?.ok) { setBody(""); setSubmissionId(null); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card p-3" aria-label="Reply to staff on this request">
      <label htmlFor={`reply-${requestId}`} className="eyebrow">
        {closed ? "Add to this request (reopens it)" : "Add details for staff"}
      </label>
      <textarea
        id={`reply-${requestId}`} value={body} onChange={(e) => setBody(e.target.value)} rows={2} disabled={busy}
        maxLength={maxChars * 2} placeholder="Add details or a follow-up question"
        className="field mt-2"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {closed ? "Reply and reopen" : "Send to staff"}
        </button>
        <DeliveryStatus delivery={delivery} />
      </div>
    </form>
  );
}
