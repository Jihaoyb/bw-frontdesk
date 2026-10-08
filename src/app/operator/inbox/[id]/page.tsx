import Link from "next/link";
import { notFound } from "next/navigation";
import { openKnowledgeDraftFormAction } from "@/app/actions";
import { InboxList, parseFilter } from "@/components/inbox-list";
import { MessageBubble, messageTime } from "@/components/message-bubble";
import { PerspectiveNav } from "@/components/perspective-nav";
import { formatPublished } from "@/components/policy-list";
import { originLabel, StatusPill } from "@/components/request-card";
import { StaffReplyPanel } from "@/components/staff-reply-panel";
import { listInquiries } from "@/lib/inquiries";
import { getKnowledgeEntries, type KnowledgeEntry } from "@/lib/knowledge";
import { draftEntriesForRequests, gapLabel, knowledgeGapState, type KnowledgeGapState } from "@/lib/knowledge-loop";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { matchCount, matchingCounts } from "@/lib/matching";
import { getRequest, listContextBeforeRequest, listRequestMessages, listRequests, STAFF_NAMES } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Reading a request changes nothing: no review mark, no approval.
// Issue 014: phone = the request alone; ≥1024px = inbox list left, this request right.
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; filter?: string }> }) {
  const { id } = await params;
  const { error, filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);
  const session = await getActiveSession();
  const request = await getRequest(session.id, id); // scoped: other sessions' ids → null
  if (!request) notFound();
  const [requests, inquiries, messages, context] = await Promise.all([
    listRequests(session.id),
    listInquiries(session.id),
    listRequestMessages(session.id, request.id),
    listContextBeforeRequest(session.id, request.id),
  ]);
  const [drafts, policies] = await Promise.all([
    draftEntriesForRequests(session.id, requests),
    getKnowledgeEntries(session.id, requests.map((r) => r.knownPolicyEntryId)),
  ]);
  const counts = matchingCounts(inquiries);
  const requestCounts = new Map(requests.map((r) => [r.id, matchCount(counts, r)]));
  const knownPolicy = request.knownPolicyEntryId ? policies.get(request.knownPolicyEntryId) ?? null : null;
  const draftEntry = drafts.get(request.id) ?? null;
  const gap = knowledgeGapState(request, draftEntry);
  const sensitive = request.origin === "sensitive";

  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <InboxList requests={requests} drafts={drafts} policies={policies} counts={requestCounts} filter={filter} activeId={request.id} />
          </div>
        </div>

        <main className="flex min-w-0 max-w-[760px] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
            <Link href="/operator/inbox" className="btn-ghost h-10 min-h-0 w-10 px-0 lg:hidden" aria-label="Back to inbox">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <StatusPill status={request.status} />
            {sensitive && <span className="pill bg-alert-soft text-alert" data-origin="sensitive">Sensitive</span>}
            <span>Origin: <span data-origin={request.origin}>{originLabel[request.origin]}</span></span>
            <span className="mono">· {messageTime.format(request.createdAt)}</span>
          </div>

          <h2 className="text-[24px] font-semibold leading-[1.25] tracking-[-0.02em] lg:text-[28px]">{request.question}</h2>

          {context.length > 0 && (
            <details className="card text-sm" data-context-count={context.length}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3"><path d="M4 5h16v11H8l-4 4z" /></svg>
                <span className="flex-1">What the family saw before asking <span className="text-ink-3">· {context.length} message{context.length === 1 ? "" : "s"}</span></span>
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev text-ink-3"><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <div className="reveal">
                <ol className="space-y-4 px-3.5 pb-4 pt-1">
                  {context.map((m) => <li key={m.id}><MessageBubble message={m} viewer="operator" /></li>)}
                </ol>
              </div>
            </details>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="card flex flex-col gap-1.5 p-3.5">
              <p className="eyebrow">Known policy</p>
              {knownPolicy ? (
                <>
                  <p className="text-sm font-medium leading-[1.35]">{knownPolicy.title}</p>
                  <p className="line-clamp-3 text-xs leading-relaxed text-ink-2">{knownPolicy.policyText}</p>
                </>
              ) : (
                <p className="text-sm text-ink-2">{sensitive ? "Not answered from policy. Staff handle this directly." : "No policy attached."}</p>
              )}
            </div>
            <KnowledgeUpdate requestId={request.id} gap={gap} draftEntry={draftEntry} error={error} />
          </div>

          <section aria-labelledby="thread" className="flex flex-col gap-3">
            <h3 id="thread" className="eyebrow">Messages on this request</h3>
            <ol className="space-y-4">
              {messages.map((m) => <li key={m.id}><MessageBubble message={m} viewer="operator" /></li>)}
            </ol>
          </section>

          <StaffReplyPanel requestId={request.id} status={request.status} staffNames={STAFF_NAMES} maxChars={MAX_QUESTION_CHARS} canDraft={gap !== "none"} />
        </main>
      </div>
    </>
  );
}

// Knowledge-update state is independent of request progress: a closed request
// with no published update still shows none; a published update shows even if
// the request stays open.
function KnowledgeUpdate({ requestId, gap, draftEntry, error }: { requestId: string; gap: KnowledgeGapState; draftEntry: KnowledgeEntry | null; error?: string }) {
  const tone = gap === "published" ? "text-brand-deep" : gap === "draft" ? "text-person-deep" : "text-ink-2";
  return (
    <div className="card flex flex-col gap-1.5 p-3.5" data-knowledge-note={gap}>
      <p className="eyebrow">Knowledge</p>
      <p className={"text-sm font-medium leading-[1.35] " + tone} data-gap={gap}>{gapLabel[gap]}</p>
      {error ? <p role="alert" className="text-xs text-alert">{error}</p> : null}
      {gap === "none" ? (
        <p className="text-xs text-ink-3">Sensitive request: handled by staff directly. No knowledge update is suggested.</p>
      ) : gap === "gap" ? (
        <>
          <p className="text-xs leading-relaxed text-ink-3">Replies and closing publish nothing. If this showed a gap in the policies, open a draft; if the policy is complete and the family needs a decision, a reply is all it takes.</p>
          <form action={openKnowledgeDraftFormAction} className="mt-1">
            <input type="hidden" name="requestId" value={requestId} />
            <button type="submit" className="btn-link min-h-9 text-brand-deep decoration-brand/40">Open a draft</button>
          </form>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-ink-3">
          {draftEntry ? <><span className="font-medium text-ink-2">{draftEntry.title}</span> · {gap === "published" ? formatPublished(draftEntry.publishedAt) : "draft saved, not published"}. </> : null}
          <Link href={`/operator?saved=${draftEntry?.id ?? ""}#entry-${draftEntry?.id ?? ""}`} className="underline decoration-line underline-offset-2 hover:decoration-ink-3">
            {gap === "published" ? "View in Knowledge" : "Review and publish in Knowledge"}
          </Link>
          {gap === "draft" ? " Until it is published, parents and the AI still see the old text." : ""}
        </p>
      )}
    </div>
  );
}
