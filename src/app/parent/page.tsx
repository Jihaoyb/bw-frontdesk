import { AskStaffForm } from "@/components/ask-staff-form";
import { CenterInfo } from "@/components/center-info";
import { MessageBubble } from "@/components/message-bubble";
import { ParentReplyForm } from "@/components/parent-reply-form";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard } from "@/components/request-card";
import { getKnowledgeEntry } from "@/lib/knowledge";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { listMessages, listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const session = await getActiveSession();
  const [messages, requests] = await Promise.all([listMessages(session.id), listRequests(session.id)]);
  const byMessage = new Map(requests.filter((r) => r.questionMessageId).map((r) => [r.questionMessageId as string, r]));
  const knownPolicies = new Map(
    await Promise.all(
      requests.filter((r) => r.knownPolicyEntryId).map(async (r) => [r.id, await getKnowledgeEntry(session.id, r.knownPolicyEntryId as string)] as const),
    ),
  );
  // Follow-ups (parent details, staff replies) render under their request card,
  // so the exchange reads alongside the original question after a refresh.
  const followUps = new Map<string, typeof messages>();
  for (const m of messages) {
    if (m.requestId && !byMessage.has(m.id)) followUps.set(m.requestId, [...(followUps.get(m.requestId) ?? []), m]);
  }

  return (
    <>
      <PerspectiveNav active="parent" current="/parent" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <section aria-labelledby="conversation" className="space-y-3">
          <h2 id="conversation" className="text-sm font-semibold">Conversation</h2>
          {messages.length === 0 && <p className="text-sm text-stone-500">No messages yet. Ask a question below.</p>}
          <ol className="space-y-3">
            {messages.map((m) => {
              const req = byMessage.get(m.id);
              if (m.requestId && !req) return null; // rendered under its request below
              return (
                <li key={m.id} className="space-y-2">
                  <MessageBubble message={m} viewer="parent" />
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
        </section>
        <AskStaffForm maxChars={MAX_QUESTION_CHARS} />
        <CenterInfo />
      </main>
    </>
  );
}
