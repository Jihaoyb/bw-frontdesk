import { InboxSummary } from "@/components/inbox-summary";
import { OutcomePill } from "@/components/outcome-pill";
import Link from "next/link";
import { notFound } from "next/navigation";
import { openKnowledgeDraftFormAction } from "@/app/actions";
import { InboxList, parseFilter } from "@/components/inbox-list";
import { MessageBubble, messageTime } from "@/components/message-bubble";
import { formatPublished } from "@/components/policy-list";
import { originLabel, StatusPill } from "@/components/request-card";
import { StaffReplyPanel } from "@/components/staff-reply-panel";
import { listEvidence, listInquiries } from "@/lib/inquiries";
import { listRequestKnowledge, type KnowledgeEntry } from "@/lib/knowledge";
import { draftEntriesFrom, gapLabel, knowledgeGapState, type KnowledgeGapState } from "@/lib/knowledge-loop";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { matchCount, matchingCounts } from "@/lib/matching";
import { getRequest, listMessages, listRequestMessages, listRequests, STAFF_NAMES } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Reading a request changes nothing: no review mark, no approval.
// Issue 014: phone = the request alone; ≥1024px = inbox list left, this request right.
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; filter?: string }> }) {
  const { id } = await params;
  const { error, filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);
  const session = await getActiveSession();
  // One parallel batch (issue 015). Every query is session-scoped, so an id from
  // another session yields no request and the page is not found.
  const [request, requests, inquiries, messages, policies, evidence, allMessages] = await Promise.all([
    getRequest(session.id, id),
    listRequests(session.id),
    listInquiries(session.id),
    listRequestMessages(session.id, id),
    listRequestKnowledge(session.id),
    listEvidence(session.id),
    listMessages(session.id),
  ]);
  if (!request) notFound();
  const inquiry = inquiries.find((i) => i.requestId === request.id);
  const answer = allMessages.find((m) => m.id === inquiry?.answerMessageId);
  const drafts = draftEntriesFrom(requests, policies);
  const counts = matchingCounts(inquiries);
  const requestCounts = new Map(requests.map((r) => [r.id, matchCount(counts, r)]));
  const knownPolicy = request.knownPolicyEntryId ? policies.get(request.knownPolicyEntryId) ?? null : null;
  const draftEntry = drafts.get(request.id) ?? null;
  const gap = knowledgeGapState(request, draftEntry);
  const sensitive = request.origin === "sensitive";

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 lg:px-8"><InboxSummary inquiries={inquiries} /></div>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <div className="hidden lg:block">
          <div className="sticky top-36">
            <InboxList requests={requests} inquiries={inquiries} drafts={drafts} policies={policies} counts={requestCounts} filter={filter} activeId={request.id} />
          </div>
        </div>

        <main className="flex min-w-0 max-w-[760px] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
            <Link href={`/operator/inbox?filter=${filter}#item-${request.id}`} className="btn-ghost h-10 min-h-0 w-10 px-0 lg:hidden" aria-label="Back to inbox">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <StatusPill status={request.status} />
            {sensitive && <span className="pill bg-alert-soft text-alert" data-origin="sensitive">Sensitive</span>}
            <span>Origin: <span data-origin={request.origin}>{originLabel[request.origin]}</span></span>
            <span className="mono">· {messageTime.format(request.createdAt)}</span>
          </div>

          {inquiry && <OutcomePill outcome={inquiry.outcome} />}
          <h2 className="text-[24px] font-semibold leading-[1.25] tracking-[-0.02em] lg:text-[28px]">{request.question}</h2>

          {answer && <MessageBubble message={answer} viewer="operator" sources={evidence.get(answer.id) ?? []} />}

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
              {messages.map((m) => <li key={m.id}><MessageBubble message={m} viewer="operator" sources={evidence.get(m.id) ?? []} /></li>)}
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
      <p className="eyebrow">Handbook</p>
      <p className={"text-sm font-medium leading-[1.35] " + tone} data-gap={gap}>{gapLabel[gap]}</p>
      {error ? <p role="alert" className="text-xs text-alert">{error}</p> : null}
      {gap === "none" ? (
        <p className="text-xs text-ink-3">Sensitive request: handled by staff directly. No Handbook update is suggested.</p>
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
            {gap === "published" ? "View in Handbook" : "Review and publish in Handbook"}
          </Link>
          {gap === "draft" ? " Until it is published, parents and the AI still see the old text." : ""}
        </p>
      )}
    </div>
  );
}
