import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageBubble } from "@/components/message-bubble";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard, originLabel } from "@/components/request-card";
import { StaffReplyPanel } from "@/components/staff-reply-panel";
import { getKnowledgeEntry } from "@/lib/knowledge";
import { gapLabel, knowledgeGapState } from "@/lib/knowledge-loop";
import { openKnowledgeDraftFormAction } from "@/app/actions";
import { formatPublished } from "@/components/policy-list";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { getRequest, listRequestMessages, STAFF_NAMES } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Reading a request changes nothing: no review mark, no approval.
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { id } = await params;
  const session = await getActiveSession();
  const request = await getRequest(session.id, id); // scoped: other sessions' ids → null
  if (!request) notFound();
  const [knownPolicy, draftEntry, messages] = await Promise.all([
    request.knownPolicyEntryId ? getKnowledgeEntry(session.id, request.knownPolicyEntryId) : null,
    request.knowledgeDraftEntryId ? getKnowledgeEntry(session.id, request.knowledgeDraftEntryId) : null,
    listRequestMessages(session.id, request.id),
  ]);
  const gap = knowledgeGapState(request, draftEntry);
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
        <StaffReplyPanel requestId={request.id} status={request.status} staffNames={STAFF_NAMES} maxChars={MAX_QUESTION_CHARS} canDraft={gap !== "none"} />
        <KnowledgeUpdate requestId={request.id} gap={gap} draftEntry={draftEntry} error={error} />
      </main>
    </>
  );
}

// Knowledge-gap visibility is independent of request progress: a closed request
// with no published update still shows the gap; a published update shows even if
// the request stays open.
function KnowledgeUpdate({ requestId, gap, draftEntry, error }: {
  requestId: string; gap: ReturnType<typeof knowledgeGapState>; draftEntry: Awaited<ReturnType<typeof getKnowledgeEntry>>; error?: string;
}) {
  const tone = gap === "published" ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : gap === "draft" ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "bg-stone-100 text-stone-700";
  return (
    <section aria-labelledby="knowledge-update" className="card p-4 text-sm" data-knowledge-note={gap}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="knowledge-update" className="text-base font-semibold tracking-tight">Knowledge update</h3>
        <span className={"pill " + tone} data-gap={gap}>{gapLabel[gap]}</span>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-800">{error}</p> : null}
      {gap === "none" ? (
        <p className="mt-2 text-xs text-stone-500">Sensitive request: handled by staff directly. No knowledge update is suggested.</p>
      ) : gap === "gap" ? (
        <>
          <p className="mt-2 text-xs text-stone-500">
            Viewing this page records nothing. Replies and closing do not publish knowledge; a reply alone leaves this gap open for the next family who asks.
          </p>
          <form action={openKnowledgeDraftFormAction} className="mt-3">
            <input type="hidden" name="requestId" value={requestId} />
            <button type="submit" className="btn-ghost">Open knowledge draft</button>
          </form>
        </>
      ) : (
        <p className="mt-2 text-xs text-stone-500">
          {draftEntry ? <><span className="font-medium text-stone-700">{draftEntry.title}</span> · {gap === "published" ? formatPublished(draftEntry.publishedAt) : "draft saved, not published"}. </> : null}
          <Link href={`/operator?saved=${draftEntry?.id ?? ""}#entry-${draftEntry?.id ?? ""}`} className="underline decoration-stone-300 underline-offset-2">
            {gap === "published" ? "View in Knowledge" : "Review and publish in Knowledge"}
          </Link>
          {gap === "draft" ? " Until it is published, parents and the AI still see the old text." : ""}
        </p>
      )}
    </section>
  );
}

