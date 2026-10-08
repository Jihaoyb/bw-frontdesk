"use client";

// Delivery feedback for a message or action: did the server confirm the save?
// This is separate from the request's progress label, which only staff change.
export type Delivery =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

export function DeliveryStatus({ delivery }: { delivery: Delivery }) {
  return (
    <p role="status" aria-live="polite" className="text-sm" data-delivery={delivery.kind}>
      {delivery.kind === "saving" && <span className="text-stone-500">Saving…</span>}
      {delivery.kind === "saved" && <span className="text-green-800">Saved.</span>}
      {delivery.kind === "rejected" && <span className="text-red-800">{delivery.reason}</span>}
      {delivery.kind === "unconfirmed" && <span className="text-amber-800">We could not confirm this was saved. Your text is kept; try again.</span>}
    </p>
  );
}

/** Run a server action with a timeout and map the outcome to delivery feedback. */
export async function deliver<T extends { ok: boolean; error?: string }>(
  run: () => Promise<T>, setDelivery: (d: Delivery) => void,
): Promise<T | null> {
  setDelivery({ kind: "saving" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      run(),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 10000); }),
    ]);
    if (result === null) { setDelivery({ kind: "unconfirmed" }); return null; }
    if (!result.ok) { setDelivery({ kind: "rejected", reason: result.error ?? "Not saved." }); return result; }
    setDelivery({ kind: "saved" });
    return result;
  } catch {
    setDelivery({ kind: "unconfirmed" });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
