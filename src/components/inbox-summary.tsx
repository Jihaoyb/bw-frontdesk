import type { Inquiry } from '@/lib/inquiries';
import { answerRate } from '@/lib/inbox';
export function InboxSummary({ inquiries }: { inquiries: Inquiry[] }) {
  const { percentage, answered, eligible } = answerRate(inquiries);
  return <section aria-label="Inbox summary" className="card space-y-1 px-4 py-3">
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="text-2xl">{percentage === null ? '—' : `${percentage}%`}</strong>
      <span className="font-medium">Answered on the spot</span><span className="text-sm text-ink-3">{eligible ? `${answered} of ${eligible} questions` : 'No questions yet'}</span></p>
    <p className="text-xs text-ink-3">All chats in this demo. Counts answered, clarified, handoff, sensitive, and failed AI outcomes; excludes greetings, pending, and direct staff messages. Recorded outcomes, not verified accuracy.</p>
  </section>;
}
