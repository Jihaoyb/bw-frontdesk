import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageBubble } from "@/components/message-bubble";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard, originLabel } from "@/components/request-card";
import { StaffReplyPanel } from "@/components/staff-reply-panel";
import { getKnowledgeEntry } from "@/lib/knowledge";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { getRequest, listRequestMessages, STAFF_NAMES } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Reading a request changes nothing: no review mark, no approval.
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getActiveSession();
  const request = await getRequest(session.id, id); // scoped: other sessions' ids → null
  if (!request) notFound();
  const [knownPolicy, messages] = await Promise.all([
    request.knownPolicyEntryId ? getKnowledgeEntry(session.id, request.knownPolicyEntryId) : null,
    listRequestMessages(session.id, request.id),
  ]);
  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <Link href="/operator/inbox" className="underline decoration-stone-300 underline-offset-2">← Inbox</Link>
          <span>Origin: <span data-origin={request.origin}>{originLabel[request.origin]}</span></span>
        </div>
        <RequestCard request={request} knownPolicy={knownPolicy} />
        <section aria-labelledby="thread" className="space-y-3">
          <h3 id="thread" className="eyebrow">Messages on this request</h3>
          <ol className="space-y-3">
            {messages.map((m) => <li key={m.id}><MessageBubble message={m} viewer="operator" /></li>)}
          </ol>
        </section>
        <StaffReplyPanel requestId={request.id} status={request.status} staffNames={STAFF_NAMES} maxChars={MAX_QUESTION_CHARS} />
        <p className="text-xs text-stone-500" data-knowledge-note={request.origin === "sensitive" ? "none" : "gap"}>
          {request.origin === "sensitive"
            ? "Sensitive request: handled by staff directly. No knowledge update is suggested."
            : "Viewing this page records nothing. Replies and closing do not publish knowledge; a reply alone leaves the knowledge gap open."}
        </p>
      </main>
    </>
  );
}
