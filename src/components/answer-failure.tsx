"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deliver, DeliveryStatus, type Delivery } from "./delivery-status";

// The front desk could not answer. The question is already saved; Retry
// reuses the same submission id so it never duplicates the question.
export function AnswerFailure({ submissionId, question, reason }: { submissionId: string; question: string; reason: string | null }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery>({ kind: "idle" });
  const busy = delivery.kind === "saving";
  const limited = reason?.startsWith("allowance_");

  async function retry() {
    const result = await deliver(async () => {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId, question }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== "failed") return { ok: true };
      if (res.status === 429) return { ok: false, error: "The AI allowance is used up. Staff can still help." };
      if (res.status === 503) return { ok: false, error: "AI answers are turned off right now. Staff can still help." };
      return { ok: false, error: "Still could not answer. Your question is kept." };
    }, setDelivery);
    if (result?.ok) router.refresh();
  }

  async function askStaff() {
    const result = await deliver(async () => {
      const res = await fetch("/api/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId, question }) });
      return res.ok ? { ok: true } : { ok: false, error: "Could not reach staff inbox. Try again." };
    }, setDelivery);
    if (result?.ok) router.refresh();
  }

  return (
    <div className="rise-late flex max-w-[92%] flex-col gap-2.5 rounded-2xl border border-dashed border-line bg-surface/70 px-4 py-3 text-sm" data-outcome="failed">
      <p className="font-medium text-ink">
        {limited ? "The AI allowance for this demo is used up." : reason === "stale_pending" ? "That answer never came back." : "The assistant couldn't answer just now."}
      </p>
      <p className="text-ink-2">Your question is saved. You can {limited ? "" : "try again, "}browse the policies, or send it to school staff.</p>
      <div className="flex flex-wrap gap-2">
        {!limited && <button type="button" onClick={retry} disabled={busy} className="btn-primary">Retry</button>}
        <Link href="/parent/policies" className="btn-ghost">Browse policies</Link>
        <button type="button" onClick={askStaff} disabled={busy} className="btn-ghost">Send to school staff</button>
      </div>
      <DeliveryStatus delivery={delivery} />
    </div>
  );
}
