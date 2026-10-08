import { AnswerFailure } from "@/components/answer-failure";
import { isStalePending } from "@/lib/inquiries";
import { CenterInfo } from "@/components/center-info";
import { Composer } from "@/components/composer";
import { HandoffOffer } from "@/components/handoff-offer";
import { MessageBubble } from "@/components/message-bubble";
import { ParentReplyForm } from "@/components/parent-reply-form";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard } from "@/components/request-card";
import { listEvidence, listInquiries } from "@/lib/inquiries";
import { getKnowledgeEntries } from "@/lib/knowledge";
import { AI_ANSWERS_ENABLED, MAX_QUESTION_CHARS } from "@/lib/limits";
import { listMessages, listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";
import { readUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const session = await getActiveSession();
  const [messages, requests, inquiries, evidence, usage] = await Promise.all([
    listMessages(session.id), listRequests(session.id), listInquiries(session.id), listEvidence(session.id), readUsage(session.id),
  ]);
  const requestByMessage = new Map(requests.filter((r) => r.questionMessageId).map((r) => [r.questionMessageId as string, r]));
  // Failed answers and abandoned claims (pending past the model timeout) both get the recovery card.
  const failedByMessage = new Map(inquiries.filter((i) => (i.outcome === "failed" || isStalePending(i)) && i.questionMessageId).map((i) => [i.questionMessageId as string, i]));
  // Open offers: the front desk could not settle it and no request exists yet.
  const offerByAnswer = new Map(
    inquiries.filter((i) => (i.outcome === "handoff_offered" || i.outcome === "sensitive") && i.answerMessageId && !i.requestId).map((i) => [i.answerMessageId as string, i]));
  const policyEntries = await getKnowledgeEntries(session.id, requests.map((r) => r.knownPolicyEntryId)); // one query, not one per request
  const knownPolicies = new Map(requests.map((r) => [r.id, r.knownPolicyEntryId ? policyEntries.get(r.knownPolicyEntryId) ?? null : null] as const));
  // Follow-ups (parent details, staff replies) render under their request card,
  // so the exchange reads alongside the original question after a refresh.
  const followUps = new Map<string, typeof messages>();
  for (const m of messages) {
    if (m.requestId && !requestByMessage.has(m.id)) followUps.set(m.requestId, [...(followUps.get(m.requestId) ?? []), m]);
  }

  return (
    <>
      <PerspectiveNav active="parent" current="/parent" />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4">
        <section aria-labelledby="conversation" className="flex-1 space-y-4 py-4">
          <h2 id="conversation" className="sr-only">Conversation</h2>
          {messages.length === 0 && (
            <div className="card p-5 text-center">
              <p className="text-base font-semibold tracking-tight">Hi there 👋</p>
              <p className="mt-1 text-sm text-stone-600">Ask about hours, closures, illness rules, meals, or billing. Answers come from the center&apos;s published policies, with the source attached.</p>
            </div>
          )}
          <ol className="space-y-4">
            {messages.map((m) => {
              const req = requestByMessage.get(m.id);
              const failed = failedByMessage.get(m.id);
              const offer = offerByAnswer.get(m.id);
              if (m.requestId && !req) return null; // rendered under its request below
              return (
                <li key={m.id} className="space-y-2">
                  <MessageBubble message={m} viewer="parent" sources={evidence.get(m.id) ?? []} />
                  {failed && <AnswerFailure submissionId={failed.submissionId} question={failed.question} reason={failed.outcome === "pending" ? "stale_pending" : failed.failureReason} />}
                  {offer && <HandoffOffer submissionId={offer.submissionId} question={offer.question} variant={offer.outcome === "sensitive" ? "sensitive" : "handoff"} />}
                  {req && (
                    <div className="space-y-2" data-request={req.id}>
                      <RequestCard request={req} knownPolicy={knownPolicies.get(req.id) ?? null} />
                      {(followUps.get(req.id) ?? []).map((f) => <MessageBubble key={f.id} message={f} viewer="parent" />)}
                      <ParentReplyForm requestId={req.id} maxChars={MAX_QUESTION_CHARS} closed={req.status === "closed"} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <CenterInfo />
        </section>
        <Composer maxChars={MAX_QUESTION_CHARS} usage={usage} aiEnabled={AI_ANSWERS_ENABLED} />
      </main>
    </>
  );
}
