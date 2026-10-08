import type { Inquiry } from './inquiries';
import type { StaffRequest } from './requests';

export type InboxItem = { id: string; question: string; createdAt: Date; inquiry?: Inquiry; request?: StaffRequest };
export function inboxItems(inquiries: Inquiry[], requests: StaffRequest[]): InboxItem[] {
  const linked = new Set(inquiries.flatMap((i) => i.requestId ? [i.requestId] : []));
  const byId = new Map(requests.map((r) => [r.id, r]));
  return [
    ...inquiries.map((i) => ({ id: i.requestId ?? i.id, question: i.question, createdAt: i.createdAt, inquiry: i, request: i.requestId ? byId.get(i.requestId) : undefined })),
    ...requests.filter((r) => !linked.has(r.id)).map((r) => ({ id: r.id, question: r.question, createdAt: r.createdAt, request: r })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
export function answerRate(inquiries: Pick<Inquiry, 'outcome'>[]) {
  const eligible = inquiries.filter((i) => ['answered', 'clarified', 'handoff_offered', 'sensitive', 'failed'].includes(i.outcome)).length;
  const answered = inquiries.filter((i) => i.outcome === 'answered').length;
  return { eligible, answered, percentage: eligible ? Math.round(answered / eligible * 100) : null };
}
