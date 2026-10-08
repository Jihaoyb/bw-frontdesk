import Link from "next/link";
import { InboxList, parseFilter } from "@/components/inbox-list";
import { messageTime } from "@/components/message-bubble";
import { OutcomePill } from "@/components/outcome-pill";
import { PerspectiveNav } from "@/components/perspective-nav";
import { listInquiries } from "@/lib/inquiries";
import { getKnowledgeEntries } from "@/lib/knowledge";
import { draftEntriesForRequests } from "@/lib/knowledge-loop";
import { matchCount, matchingCounts } from "@/lib/matching";
import { listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Issue 014: phone = inbox then history; ≥1024px = inbox list left, history right.
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);
  const session = await getActiveSession();
  const [requests, inquiries] = await Promise.all([listRequests(session.id), listInquiries(session.id)]);
  const [drafts, policies] = await Promise.all([
    draftEntriesForRequests(session.id, requests),
    getKnowledgeEntries(session.id, requests.map((r) => r.knownPolicyEntryId)),
  ]);
  const counts = matchingCounts(inquiries); // this session only; resets with its content
  // Match count per request: the count of its own question text in the history.
  const requestCounts = new Map(requests.map((r) => [r.id, matchCount(counts, r)]));
  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <InboxList requests={requests} drafts={drafts} policies={policies} counts={requestCounts} filter={filter} />

        <section aria-labelledby="history" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="history" className="text-[22px] font-semibold tracking-[-0.02em]">Question history</h2>
            <p className="mono text-xs text-ink-3">{inquiries.length} question{inquiries.length === 1 ? "" : "s"}</p>
          </div>
          <p className="text-xs text-ink-3">
            Every parent question in this demo session and how the front desk handled it. A count marks normalized matching questions: the same wording
            ignoring capitalization, spacing, and punctuation. Different wording is not grouped, and matching requests stay separate.
          </p>
          {inquiries.length === 0 && <p className="card p-4 text-sm text-ink-3">No questions yet.</p>}
          {inquiries.length > 0 && (
            <ul className="card divide-y divide-line-soft">
              {inquiries.map((q) => (
                <li key={q.id} className="flex items-start gap-3 px-4 py-3 text-sm" data-inquiry={q.id}>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 whitespace-pre-wrap">{q.question}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                      <span className="mono">{messageTime.format(q.createdAt)}</span>
                      {matchCount(counts, q) > 1 && (
                        <span className="pill bg-canvas text-ink-2 ring-1 ring-line" data-matching={matchCount(counts, q)}>{matchCount(counts, q)} normalized matching questions</span>
                      )}
                      {q.requestId && <Link href={`/operator/inbox/${q.requestId}`} className="underline decoration-line underline-offset-2 hover:decoration-ink-3">open request</Link>}
                    </p>
                  </div>
                  <OutcomePill outcome={q.outcome} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
