import Link from "next/link";
import { messageTime } from "@/components/message-bubble";
import { OutcomePill } from "@/components/outcome-pill";
import { PerspectiveNav } from "@/components/perspective-nav";
import { StatusPill, originLabel } from "@/components/request-card";
import { listInquiries } from "@/lib/inquiries";
import { draftEntriesForRequests, gapLabel, knowledgeGapState } from "@/lib/knowledge-loop";
import { listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getActiveSession();
  const [requests, inquiries] = await Promise.all([listRequests(session.id), listInquiries(session.id)]);
  const drafts = await draftEntriesForRequests(session.id, requests);
  const open = requests.filter((r) => r.status !== "closed").length;
  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-4">
        <section aria-labelledby="inbox">
          <div className="flex items-baseline justify-between">
            <h2 id="inbox" className="text-base font-semibold tracking-tight">Staff requests</h2>
            <p className="text-xs text-stone-500">{open} open · {requests.length} total</p>
          </div>
          <p className="mt-1 text-xs text-stone-500">Opening a request does not mark it reviewed.</p>
          {requests.length === 0 && <p className="card mt-3 p-4 text-sm text-stone-500">No requests yet.</p>}
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/operator/inbox/${r.id}`} className="card block p-3.5 text-sm transition hover:border-stone-300">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusPill status={r.status} />
                    <span className={"pill " + (r.origin === "sensitive" ? "bg-red-50 text-red-900 ring-1 ring-red-200" : "bg-stone-100 text-stone-600")} data-origin={r.origin}>{originLabel[r.origin]}</span>
                    {(() => {
                      const gap = knowledgeGapState(r, drafts.get(r.id) ?? null);
                      if (gap === "none") return null;
                      const tone = gap === "published" ? "bg-emerald-50 text-emerald-900" : gap === "draft" ? "bg-amber-50 text-amber-900" : "bg-stone-100 text-stone-600";
                      return <span className={"pill " + tone} data-gap={gap}>{gapLabel[gap]}</span>;
                    })()}
                    <span className="ml-auto text-stone-500">{messageTime.format(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap font-medium">{r.question}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="history">
          <div className="flex items-baseline justify-between">
            <h2 id="history" className="text-base font-semibold tracking-tight">Question history</h2>
            <p className="text-xs text-stone-500">{inquiries.length} question{inquiries.length === 1 ? "" : "s"}</p>
          </div>
          <p className="mt-1 text-xs text-stone-500">Every parent question in this demo session and how the front desk handled it.</p>
          {inquiries.length === 0 && <p className="card mt-3 p-4 text-sm text-stone-500">No questions yet.</p>}
          <ul className="card mt-3 divide-y divide-stone-100">
            {inquiries.map((q) => (
              <li key={q.id} className="flex items-start gap-3 px-4 py-3 text-sm" data-inquiry={q.id}>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 whitespace-pre-wrap">{q.question}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {messageTime.format(q.createdAt)}
                    {q.requestId && <> · <Link href={`/operator/inbox/${q.requestId}`} className="underline decoration-stone-300 underline-offset-2">open request</Link></>}
                  </p>
                </div>
                <OutcomePill outcome={q.outcome} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
