import Link from "next/link";
import type { KnowledgeEntry } from '@/lib/knowledge';
import type { Inquiry } from '@/lib/inquiries';
import { inboxItems } from '@/lib/inbox';
import { gapLabel, knowledgeGapState } from '@/lib/knowledge-loop';
import { matchingCounts, matchCount } from '@/lib/matching';
import type { StaffRequest } from '@/lib/requests';
import { messageTime } from './message-bubble';
import { StatusPill } from './request-card';
import { OutcomePill } from './outcome-pill';

export type InboxFilter = 'all' | 'action' | 'open' | 'closed';
export function needsAction(r: StaffRequest): boolean { return r.status === 'awaiting_review'; }
export function applyFilter(requests: StaffRequest[], filter: InboxFilter): StaffRequest[] {
  if (filter === 'all') return requests;
  if (filter === 'action') return requests.filter(needsAction);
  if (filter === 'closed') return requests.filter((r) => r.status === 'closed');
  return requests.filter((r) => r.status !== 'closed');
}
export function parseFilter(raw: string | undefined): InboxFilter {
  return raw === 'all' || raw === 'open' || raw === 'closed' ? raw : 'action';
}
export function queueCounts(requests: StaffRequest[]) {
  const closed = requests.filter((r) => r.status === 'closed').length;
  return { open: requests.length - closed, action: requests.filter(needsAction).length, closed };
}
const colors = { all: 'text-ink', open: 'text-[#245b9c]', action: 'text-[#885508]', closed: 'text-[#28644f]' };

export function InboxList({ requests, inquiries = [], drafts, counts, filter, activeId, basePath = '/operator/inbox' }: {
  requests: StaffRequest[]; inquiries?: Inquiry[]; drafts: Map<string, KnowledgeEntry | null>;
  policies: Map<string, KnowledgeEntry>; counts: Map<string, number>; filter: InboxFilter; activeId?: string; basePath?: string;
}) {
  const all = inboxItems(inquiries, requests);
  const allowed = new Set(applyFilter(requests, filter).map((r) => r.id));
  const shown = filter === 'all' ? all : all.filter((i) => i.request && allowed.has(i.request.id));
  const chatId = (item: typeof shown[number]) => item.inquiry?.conversationId ?? item.request?.conversationId ?? 'history';
  const chatDates = new Map<string, Date>();
  for (const item of all) {
    const id = chatId(item);
    if (!chatDates.has(id) || chatDates.get(id)! > item.createdAt) chatDates.set(id, item.createdAt);
  }
  if (filter === 'all') shown.sort((a, b) => chatDates.get(chatId(b))!.getTime() - chatDates.get(chatId(a))!.getTime() || b.createdAt.getTime() - a.createdAt.getTime());
  const totals = { ...queueCounts(requests), all: all.length };
  const matches = matchingCounts(inquiries);
  return <section aria-labelledby="inbox" className="flex min-w-0 flex-col gap-3">
    <h2 id="inbox" className="text-[22px] font-semibold tracking-[-0.02em]">Inbox</h2>
    <nav aria-label="Inbox filters" className="flex flex-wrap gap-2">
      {(['all', 'action', 'open', 'closed'] as const).map((f) => <Link key={f} href={`${basePath}?filter=${f}`} aria-current={filter === f ? 'page' : undefined}
        className={`chip ${colors[f]} ${filter === f ? 'ring-2 ring-brand/40' : ''}`} data-filter={f}>
        {{ all: 'All', action: 'Needs action', open: 'Open', closed: 'Closed' }[f]} · {totals[f]}
      </Link>)}
    </nav>
    <p className="text-xs text-ink-3">Opening an item changes no review state. ×N counts matching wording; repeated questions stay separate.</p>
    {!shown.length && <p className="card p-4 text-sm text-ink-3">{filter === 'action' ? 'Nothing needs action. Choose All to read every question.' : filter === 'open' ? 'No open requests.' : filter === 'closed' ? 'Nothing closed yet.' : 'No questions yet.'}</p>}
    <ul className="flex flex-col gap-2.5">
      {shown.map((item, index) => {
        const r = item.request;
        const n = item.inquiry ? matchCount(matches, item.inquiry) : counts.get(item.id) ?? 1;
        const href = r ? `/operator/inbox/${r.id}?filter=${filter}` : `/operator/inbox?filter=${filter}&inquiry=${item.id}`;
        return <li key={item.id} id={`item-${item.id}`}>
          {filter === 'all' && (index === 0 || chatId(shown[index - 1]) !== chatId(item)) && <p className="eyebrow pb-2 pt-3">Chat · {messageTime.format(chatDates.get(chatId(item))!)}</p>}
          <Link href={href} aria-current={activeId === item.id ? 'page' : undefined}
            className={`card flex flex-col gap-2 border-l-4 p-3.5 text-sm hover:border-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activeId === item.id ? 'border-brand bg-brand-soft' : r?.status === 'awaiting_review' ? 'border-l-person' : ''}`}
            data-request-row={r?.id} data-inquiry-row={item.inquiry?.id}>
            <span className="flex flex-wrap items-center gap-2">{r ? <StatusPill status={r.status} /> : item.inquiry && <OutcomePill outcome={item.inquiry.outcome} />}
              <span className="ml-auto text-xs text-ink-3">{messageTime.format(item.createdAt)}</span>
              {n > 1 && <span className="mono" title={`${n} normalized matching questions`} data-matching={n}>×{n}</span>}
            </span>
            <span className="line-clamp-2 whitespace-pre-wrap text-base font-medium">{item.question}</span>
            {r && <span className="text-xs text-ink-3">{gapLabel[knowledgeGapState(r, drafts.get(r.id) ?? null)]}</span>}
          </Link>
        </li>;
      })}
    </ul>
  </section>;
}
