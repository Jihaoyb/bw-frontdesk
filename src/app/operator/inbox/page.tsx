import Link from "next/link";
import { InboxList, parseFilter, queueCounts } from "@/components/inbox-list";
import { listInquiries } from "@/lib/inquiries";
import { listRequestKnowledge } from "@/lib/knowledge";
import { draftEntriesFrom } from "@/lib/knowledge-loop";
import { matchCount, matchingCounts } from "@/lib/matching";
import { listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Issue 016: the inbox is the queue only. Phone = the list; ≥1024px = list left
// and, with no request open, a quiet panel right. Question history lives at
// /operator/questions as a conversation.
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);
  const session = await getActiveSession();
  const [requests, inquiries, policies] = await Promise.all([listRequests(session.id), listInquiries(session.id), listRequestKnowledge(session.id)]);
  const drafts = draftEntriesFrom(requests, policies);
  const counts = matchingCounts(inquiries); // this session only; resets with its content
  const requestCounts = new Map(requests.map((r) => [r.id, matchCount(counts, r)]));
  const q = queueCounts(requests);
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
      <InboxList requests={requests} drafts={drafts} policies={policies} counts={requestCounts} filter={filter} />

      <section aria-labelledby="queue-summary" className="hidden lg:block" data-queue-panel>
        <div className="sticky top-20 flex max-w-[480px] flex-col gap-4 py-10 text-sm text-ink-2">
          <h2 id="queue-summary" className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Pick a request</h2>
          <p>It opens here. Opening a request marks nothing; only Mark reviewing, a reply, or Close change its progress.</p>
          <dl className="grid grid-cols-3 gap-3">
            {([["Open", q.open, "open"], ["Need action", q.action, "action"], ["Closed", q.closed, "closed"]] as const).map(([label, n, f]) => (
              <div key={f} className="card flex flex-col gap-1 p-3.5">
                <dt className="eyebrow">{label}</dt>
                <dd className="mono text-[22px] font-semibold tracking-[-0.02em] text-ink" data-count={f}>{n}</dd>
              </div>
            ))}
          </dl>
          <p>
            Every parent question in this demo, with how the front desk handled it, reads as a conversation under{" "}
            <Link href="/operator/questions" className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink-3">Questions</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
