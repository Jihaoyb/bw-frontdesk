import { resetDemoAction } from "@/app/actions";

// Confirmation is a two-step inline form: the first submit only opens the
// confirm step (a GET that changes nothing); only the "yes" submit resets.
export function ResetDemo({ confirming, resetCount }: { confirming: boolean; resetCount: number }) {
  return (
    <section aria-labelledby="reset" className="card p-4">
      <h2 id="reset" className="text-sm font-semibold">Reset demo</h2>
      <p className="mt-1 text-xs text-ink-3">
        Restores this demo session&apos;s starting policies. Other visitors&apos; sessions are not affected.
        {resetCount > 0 ? ` Reset ${resetCount} time${resetCount === 1 ? "" : "s"} so far.` : ""}
      </p>
      {confirming ? (
        <div className="mt-3 rounded-2xl bg-alert-soft p-3.5 text-sm text-ink">
          <p className="font-medium">Reset this demo session? This removes the session&apos;s work and cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <form action={resetDemoAction}>
              <input type="hidden" name="confirm" value="yes" />
              <button type="submit" className="btn-primary bg-alert hover:bg-[#8f1c13]">
                Yes, reset
              </button>
            </form>
            <form action="/operator" method="get">
              <button type="submit" className="btn-ghost">
                Cancel
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form action="/operator" method="get" className="mt-3">
          <input type="hidden" name="reset" value="confirm" />
          <button type="submit" className="btn-ghost">
            Reset demo…
          </button>
        </form>
      )}
    </section>
  );
}
