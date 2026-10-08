"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Shown under an assistant message that could not settle the question. Nothing
// is sent to staff until the parent chooses; the save reuses the question's
// submission id, so a retry never creates a second request.
export function HandoffOffer({ submissionId, question, variant }: { submissionId: string; question: string; variant: "handoff" | "sensitive" }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const busy = delivery.kind === "saving";
  const sensitive = variant === "sensitive";

  async function askStaff() {
    const result = await deliver(async () => {
      const res = await fetch("/api/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId, question }) });
      return res.ok ? { ok: true } : { ok: false, error: "Could not save the request. Try again." };
    }, setDelivery);
    if (result?.ok) router.refresh();
  }

  return (
    <div className="rise-late flex max-w-[92%] flex-col gap-2.5" data-offer={variant}>
      <p className="text-sm text-ink-2">
        {sensitive ? "This one is for school staff, not the automated assistant. Nothing is sent until you choose." : "Your question is saved. Sending it adds it to the staff inbox; nothing is sent until you choose."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={askStaff} disabled={busy} className="btn-brand">Send to school staff</button>
        {!sensitive && <Link href="/parent/policies" className="btn-ghost">Browse policies</Link>}
      </div>
      <DeliveryStatus delivery={delivery} />
    </div>
  );
}
