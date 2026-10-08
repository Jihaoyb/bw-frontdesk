import Link from "next/link";
import { PerspectiveNav } from "@/components/perspective-nav";
import { originLabel, statusLabel } from "@/components/request-card";
import { centerConfig } from "@/lib/center-config";
import { listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-US", { timeZone: centerConfig.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function InboxPage() {
  const session = await getActiveSession();
  const requests = await listRequests(session.id);
  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <section aria-labelledby="inbox">
          <h2 id="inbox" className="text-sm font-semibold">Staff requests</h2>
          <p className="mt-1 text-xs text-stone-500">{requests.length} request{requests.length === 1 ? "" : "s"}. Opening a request does not mark it reviewed.</p>
          {requests.length === 0 && <p className="mt-3 text-sm text-stone-500">No requests yet.</p>}
          <ul className="mt-2 space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/operator/inbox/${r.id}`} className="block rounded-lg border border-stone-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5" data-status={r.status}>{statusLabel[r.status]}</span>
                    <span className={"rounded-full px-2 py-0.5 " + (r.origin === "sensitive" ? "bg-red-100 text-red-900" : "bg-stone-100")} data-origin={r.origin}>{originLabel[r.origin]}</span>
                    <span className="text-stone-500">{time.format(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap">{r.question}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
