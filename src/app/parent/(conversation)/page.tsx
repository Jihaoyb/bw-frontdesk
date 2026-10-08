import { AnswerFailure } from "@/components/answer-failure";
import { isStalePending } from "@/lib/inquiries";
import { CenterInfo } from "@/components/center-info";
import { Composer } from "@/components/composer";
import { HandoffOffer } from "@/components/handoff-offer";
import { MessageBubble } from "@/components/message-bubble";
import { ParentReplyForm } from "@/components/parent-reply-form";
import { RequestCard, statusLabel } from "@/components/request-card";
import { listEvidence, listInquiries } from "@/lib/inquiries";
import { listRequestKnowledge } from "@/lib/knowledge";
import { AI_ANSWERS_ENABLED, MAX_QUESTION_CHARS } from "@/lib/limits";
import { getOrCreateConversation, listMessages, listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";
import { readUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const session = await getActiveSession();
  // One parallel batch (issue 015): nothing here waits on another page query.
  const [allMessages, requests, inquiries, evidence, usage, policyEntries, conversationId] = await Promise.all([
    listMessages(session.id), listRequests(session.id), listInquiries(session.id), listEvidence(session.id), readUsage(session.id), listRequestKnowledge(session.id), getOrCreateConversation(session.id),
  ]);
  const messages = allMessages.filter((m) => m.conversationId === conversationId);
  const previousRequests = requests.filter((r) => r.conversationId !== conversationId);
  // A request card sits under the assistant's answer when there is one (the
  // handoff the parent accepted), else under the question itself.
  const anchorForRequest = new Map(inquiries.filter((i) => i.requestId && i.answerMessageId).map((i) => [i.requestId as string, i.answerMessageId as string]));
  const requestByMessage = new Map(
    requests.filter((r) => r.questionMessageId).map((r) => [anchorForRequest.get(r.id) ?? (r.questionMessageId as string), r]),
  );
  const questionOfRequest = new Set(requests.map((r) => r.questionMessageId));
  // Failed answers and abandoned claims (pending past the model timeout) both get the recovery card.
  const failedByMessage = new Map(inquiries.filter((i) => !i.requestId && (i.outcome === "failed" || isStalePending(i)) && i.questionMessageId).map((i) => [i.questionMessageId as string, i]));
  // Open offers: the front desk could not settle it and no request exists yet.
  const offerByAnswer = new Map(
    inquiries.filter((i) => (i.outcome === "handoff_offered" || i.outcome === "sensitive") && i.answerMessageId && !i.requestId).map((i) => [i.answerMessageId as string, i]));
  const knownPolicies = new Map(requests.map((r) => [r.id, r.knownPolicyEntryId ? policyEntries.get(r.knownPolicyEntryId) ?? null : null] as const));
  // Follow-ups (parent details, staff replies) render under their request card,
  // so the exchange reads alongside the original question after a refresh.
  const followUps = new Map<string, typeof messages>();
  for (const m of allMessages) {
    if (m.requestId && !questionOfRequest.has(m.id)) followUps.set(m.requestId, [...(followUps.get(m.requestId) ?? []), m]);
  }

  return (
    <>
      {/* Issue 014: phone = one column; ≥1024px = conversation column plus a sticky rail (contact, your requests, session note). */}
      <div className="mx-auto flex w-full max-w-[1104px] flex-1 gap-10 px-4 lg:px-8">
        <main className="flex w-full min-w-0 flex-1 flex-col">
          <Composer key={conversationId} conversationId={conversationId} savedMessageIds={messages.map((m) => m.id)} maxChars={MAX_QUESTION_CHARS} usage={usage} aiEnabled={AI_ANSWERS_ENABLED}
            footer={<>
              {previousRequests.length > 0 && <section aria-label="Requests from previous chats" className="space-y-4 border-t border-line pt-5">
                <h2 className="eyebrow">Requests from previous chats</h2>
                {previousRequests.map((req) => <details key={req.id} id={`request-${req.id}`} className="card p-3">
                  <summary className="cursor-pointer py-2 text-sm font-medium">{req.question} · {statusLabel[req.status]}</summary>
                  <div className="space-y-3 pt-3"><RequestCard request={req} knownPolicy={knownPolicies.get(req.id) ?? null} />
                    {(followUps.get(req.id) ?? []).map((m) => <MessageBubble key={m.id} message={m} viewer="parent" />)}
                    <ParentReplyForm requestId={req.id} maxChars={MAX_QUESTION_CHARS} closed={req.status === 'closed'} />
                  </div>
                </details>)}
              </section>}
              <div className="lg:hidden"><CenterInfo /></div><p className="text-xs text-ink-3 lg:hidden" data-session-note>{sessionNote}</p></>}>
            <h2 id="conversation" className="sr-only">Conversation</h2>
            {messages.length === 0 && (
              <div className="rise flex flex-col gap-2 py-6">
                <p className="text-[22px] font-semibold tracking-[-0.02em]">Ask the front desk</p>
                <p className="measure text-ink-2">Hours, closures, illness rules, meals, billing. An AI assistant answers from the center&apos;s published policies and shows its source.</p>
                <p className="text-sm text-ink-3">Messages to school staff are not live chat: staff read them during office hours and reply here.</p>
              </div>
            )}
            <ol className="space-y-6">
              {messages.map((m) => {
                const req = requestByMessage.get(m.id);
                const failed = failedByMessage.get(m.id);
                const offer = offerByAnswer.get(m.id);
                if (m.requestId && !questionOfRequest.has(m.id)) return null; // a follow-up: rendered under its request
                return (
                  <li key={m.id} className="space-y-3">
                    <MessageBubble message={m} viewer="parent" sources={evidence.get(m.id) ?? []} />
                    {failed && <AnswerFailure submissionId={failed.submissionId} question={failed.question} reason={failed.outcome === "pending" ? "stale_pending" : failed.failureReason} />}
                    {offer && <HandoffOffer submissionId={offer.submissionId} question={offer.question} variant={offer.outcome === "sensitive" ? "sensitive" : "handoff"} />}
                    {req && (
                      <div className="space-y-3" data-request={req.id} id={`request-${req.id}`}>
                        <RequestCard request={req} knownPolicy={knownPolicies.get(req.id) ?? null} />
                        {(followUps.get(req.id) ?? []).map((f) => <MessageBubble key={f.id} message={f} viewer="parent" />)}
                        <ParentReplyForm requestId={req.id} maxChars={MAX_QUESTION_CHARS} closed={req.status === "closed"} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Composer>
        </main>
        <aside className="hidden w-[320px] shrink-0 lg:block" aria-label="Your requests and contact">
          <div className="sticky top-20 flex flex-col gap-4 py-5">
            <CenterInfo />
            <section aria-labelledby="your-requests" className="card p-4">
              <div className="flex items-baseline justify-between">
                <h2 id="your-requests" className="eyebrow">Your requests</h2>
                <span className="mono text-xs text-ink-3">{requests.length}</span>
              </div>
              {requests.length === 0 ? (
                <p className="mt-2 text-sm text-ink-3">Nothing sent to staff yet. A request appears here once you send one.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line-soft">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <a href={`#request-${r.id}`} className="flex items-start gap-2.5 py-2.5 text-sm hover:text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                        <span aria-hidden className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (r.status === "closed" ? "bg-brand" : r.status === "awaiting_review" ? "bg-ink-3" : "bg-person")} />
                        <span className="min-w-0">
                          <span className="line-clamp-2">{r.question}</span>
                          <span className="mt-0.5 block text-xs text-ink-3">{statusLabel[r.status]}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="px-1 text-xs text-ink-3" data-session-note>{sessionNote}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

const sessionNote =
  "Conversations live in this browser's demo session and stay until the demo is reset; this demo is not tied to an account and does not expire on its own. Messages you send to school staff can be read by staff in this demo. Start over keeps earlier chats and requests for staff. Reset demo (Operator view) deletes all chats, requests, and published updates.";
