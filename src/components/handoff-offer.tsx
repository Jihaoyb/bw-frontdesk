"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// Shown under a front-desk message that could not settle the question. Nothing
// is sent to staff until the parent chooses Ask staff; the save reuses the
// question's submission id, so a retry never creates a second request.
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
    <div
      className={"rise max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm ring-1 " + (sensitive ? "bg-red-50/60 ring-red-200" : "bg-white/70 ring-stone-200")}
      data-offer={variant}
    >
      <p className="font-medium text-stone-800">{sensitive ? "This one is for staff, not the automated front desk." : "Want staff to take a look?"}</p>
      <p className="mt-0.5 text-stone-600">
        {sensitive ? "Send it to staff and they pick it up during office hours." : "Your question is saved. Sending it to staff adds it to their inbox; nothing is sent until you choose to."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={askStaff} disabled={busy} className="btn-primary">Ask staff</button>
        {!sensitive && <Link href="/parent/policies" className="btn-ghost">Browse center policies</Link>}
      </div>
      <div className="mt-2"><DeliveryStatus delivery={delivery} /></div>
    </div>
  );
}
