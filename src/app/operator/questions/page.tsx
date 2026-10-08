import Link from "next/link";
import { MessageBubble } from "@/components/message-bubble";
import { OutcomePill } from "@/components/outcome-pill";
import { inquiryByQuestion, outcomeCounts } from "@/lib/questions-thread";
import { listEvidence, listInquiries, type InquiryOutcome } from "@/lib/inquiries";
import { matchCount, matchingCounts } from "@/lib/matching";
import { listMessages } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

const outcomeOrder: InquiryOutcome[] = ["chat", "answered", "clarified", "handoff_offered", "staff_requested", "sensitive", "failed", "pending"];

// Issue 016: the session's questions as the conversation the parent saw, read
// only, with an outcome beside each handled question. Phone = the thread;
// ≥1024px = thread plus a rail of outcome counts.
export default async function QuestionsPage() {
  const session = await getActiveSession();
  const [messages, inquiries, evidence] = await Promise.all([listMessages(session.id), listInquiries(session.id), listEvidence(session.id)]);
  const byQuestion = inquiryByQuestion(inquiries);
  const counts = matchingCounts(inquiries);
  const totals = outcomeCounts(inquiries);
  const becameRequests = inquiries.filter((i) => i.requestId).length;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:px-8">
      <main className="flex w-full min-w-0 max-w-[760px] flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Questions</h2>
            <p className="mono text-xs text-ink-3">{inquiries.length} question{inquiries.length === 1 ? "" : "s"}</p>
          </div>
          <p className="text-xs text-ink-3">
            The conversation as the family saw it, with how the front desk handled each question. ×N marks normalized matching questions: the same wording
            ignoring capitalization, spacing, and punctuation. Different wording is not grouped, and matching requests stay separate.
          </p>
        </div>
        {messages.length === 0 && <p className="card p-4 text-sm text-ink-3">No questions yet.</p>}
        <ol className="space-y-6">
          {messages.map((m) => {
            const inquiry = m.speaker === "parent" ? byQuestion.get(m.id) : undefined;
            const n = inquiry ? matchCount(counts, inquiry) : 1;
            return (
              <li key={m.id} className="space-y-2" data-inquiry={inquiry?.id}>
                <MessageBubble message={m} viewer="operator" sources={evidence.get(m.id) ?? []} />
                {inquiry && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-xs text-ink-3">
                    <OutcomePill outcome={inquiry.outcome} />
                    {n > 1 && <span className="mono" title={`${n} normalized matching questions`} data-matching={n}>×{n}</span>}
                    {inquiry.requestId && <Link href={`/operator/inbox/${inquiry.requestId}`} className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink-3">Open request</Link>}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </main>
      <aside className="hidden w-[320px] shrink-0 lg:block" aria-label="Outcomes">
        <div className="sticky top-20 flex flex-col gap-4 py-5">
          <section className="card p-4">
            <h3 className="eyebrow">By outcome</h3>
            <dl className="mt-2 divide-y divide-line-soft">
              {outcomeOrder.filter((o) => totals[o]).map((o) => (
                <div key={o} className="flex items-center justify-between py-2 text-sm">
                  <dt><OutcomePill outcome={o} /></dt>
                  <dd className="mono text-xs text-ink-3" data-outcome-count={o}>{totals[o]}</dd>
                </div>
              ))}
              {inquiries.length === 0 && <p className="py-2 text-sm text-ink-3">Nothing asked yet.</p>}
            </dl>
          </section>
          <p className="px-1 text-xs text-ink-3">
            {becameRequests} question{becameRequests === 1 ? "" : "s"} became a staff request. <Link href="/operator/inbox?filter=action" className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink-3">See what needs action</Link>.
          </p>
        </div>
      </aside>
    </div>
  );
}
