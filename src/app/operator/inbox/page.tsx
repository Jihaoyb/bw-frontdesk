import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InboxList, parseFilter } from '@/components/inbox-list';
import { InboxSummary } from '@/components/inbox-summary';
import { MessageBubble, messageTime } from '@/components/message-bubble';
import { OutcomePill } from '@/components/outcome-pill';
import { listEvidence, listInquiries } from '@/lib/inquiries';
import { listRequestKnowledge } from '@/lib/knowledge';
import { draftEntriesFrom } from '@/lib/knowledge-loop';
import { matchCount, matchingCounts } from '@/lib/matching';
import { listMessages, listRequests } from '@/lib/requests';
import { getActiveSession } from '@/lib/request-session';

export const dynamic = 'force-dynamic';
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ filter?: string; inquiry?: string }> }) {
  const { filter: raw, inquiry: id } = await searchParams;
  const filter = parseFilter(raw);
  const session = await getActiveSession();
  const [requests, inquiries, policies, messages, evidence] = await Promise.all([
    listRequests(session.id), listInquiries(session.id), listRequestKnowledge(session.id), listMessages(session.id), listEvidence(session.id),
  ]);
  const selected = id ? inquiries.find((i) => i.id === id) : null;
  if (id && !selected) notFound();
  const thread = selected ? messages.filter((m) => m.id === selected.questionMessageId || m.id === selected.answerMessageId) : [];
  const counts = matchingCounts(inquiries);
  return <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-5 lg:px-8">
    <InboxSummary inquiries={inquiries} />
    <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className={selected ? 'hidden lg:block' : ''}><InboxList requests={requests} inquiries={inquiries} policies={policies}
        drafts={draftEntriesFrom(requests, policies)} counts={new Map(requests.map((r) => [r.id, matchCount(counts, r)]))} filter={filter} activeId={selected?.requestId ?? selected?.id} /></div>
      <main className={selected ? 'min-w-0 space-y-5' : 'hidden lg:block'}>
        {selected ? <>
          <Link className="btn-link lg:hidden" href={`/operator/inbox?filter=${filter}#item-${selected.requestId ?? selected.id}`}>Back to Inbox</Link>
          <div className="flex flex-wrap items-center gap-2"><OutcomePill outcome={selected.outcome} /><span className="text-xs text-ink-3">{messageTime.format(selected.createdAt)}</span></div>
          <h2 className="text-2xl font-semibold">{selected.question}</h2>
          {selected.requestId && <Link className="btn-person" href={`/operator/inbox/${selected.requestId}?filter=${filter}`}>Open staff request</Link>}
          <p className="eyebrow">Selected question and answer</p>
          <ol className="space-y-5">{thread.map((m) => <li key={m.id} className={m.id === selected.questionMessageId ? 'rounded-2xl ring-2 ring-brand/40 p-3' : ''}><MessageBubble message={m} viewer="operator" sources={evidence.get(m.id) ?? []} /></li>)}</ol>
        </> : <div className="py-12 text-ink-2"><h2 className="text-2xl font-semibold text-ink">Pick a question or request</h2><p className="mt-3">Read the selected question, review sources, and respond to staff requests here.</p><p className="mt-2 text-sm">Choose All to see answered questions and previous chats.</p></div>}
      </main>
    </div>
  </div>;
}
