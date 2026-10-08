import type { KnowledgeEntry } from "@/lib/knowledge";
import type { StaffRequest } from "@/lib/requests";

export const statusLabel: Record<StaffRequest["status"], string> = {
  awaiting_review: "Awaiting review",
  staff_reviewing: "Staff reviewing",
  needs_your_reply: "Needs your reply",
  closed: "Closed",
};

export const statusTone: Record<StaffRequest["status"], string> = {
  awaiting_review: "bg-canvas text-ink-2 ring-1 ring-line",
  staff_reviewing: "bg-person-soft text-person-deep",
  needs_your_reply: "bg-person-soft text-person-deep ring-1 ring-[#f1e3c2]",
  closed: "bg-brand-soft text-brand-deep",
};

const statusDot: Record<StaffRequest["status"], string> = {
  awaiting_review: "bg-ink-3",
  staff_reviewing: "bg-person",
  needs_your_reply: "bg-person",
  closed: "bg-brand",
};

export const originLabel: Record<StaffRequest["origin"], string> = {
  parent_initiated: "Parent asked for staff",
  handoff_offered: "Handoff offered",
  sensitive: "Sensitive",
};

/** Status as a dot plus two words. */
export function StatusPill({ status }: { status: StaffRequest["status"] }) {
  return (
    <span className={"pill " + statusTone[status]} data-status={status}>
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + statusDot[status]} />
      {statusLabel[status]}
    </span>
  );
}

// Issue 014: the three facts (known policy, the unresolved need, staff progress)
// read as a timeline. Saved does not mean reviewed; reviewed does not mean approved.
// The question's label follows the request's state: it "still needs staff"
// only while staff have not finished with it.
export function RequestCard({ request, knownPolicy }: { request: StaffRequest; knownPolicy: KnowledgeEntry | null }) {
  const closed = request.status === "closed";
  const questionLabel = closed ? "What you asked" : request.status === "needs_your_reply" ? "Your request" : "Still needs staff";
  const sensitive = request.origin === "sensitive";
  return (
    <article aria-label="Staff request" className="card text-sm" data-request-status={request.status}>
      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-4 py-3">
        <h3 className="eyebrow">Staff request</h3>
        <div className="flex items-center gap-1.5">
          {sensitive && <span className="pill bg-alert-soft text-alert" data-origin="sensitive">Sensitive</span>}
          <StatusPill status={request.status} />
        </div>
      </div>
      <dl className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 px-4 py-4">
        <Step state="done" last={false} />
        <div className="pb-5">
          <dt className="eyebrow">Known policy</dt>
          <dd className="mt-1 leading-relaxed text-ink-2">
            {knownPolicy
              ? <><span className="font-medium text-ink">{knownPolicy.title}.</span> {knownPolicy.policyText}</>
              : <span>{sensitive ? "Not answered from policy. Staff handle this directly." : "No policy attached. Staff decide whether a knowledge update is needed."}</span>}
          </dd>
        </div>
        <Step state={closed ? "done" : "active"} last={false} />
        <div className="pb-5">
          <dt className="eyebrow" data-question-label>{questionLabel}</dt>
          <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">{request.question}</dd>
        </div>
        <Step state={closed ? "done" : "todo"} last />
        <div>
          <dt className="eyebrow">Staff progress</dt>
          <dd className="mt-1 leading-relaxed text-ink-2">
            {statusLabel[request.status]}.{" "}
            {closed
              ? "Staff closed this request. Replying below reopens it."
              : request.status === "needs_your_reply"
                ? "Staff asked you something. Reply below."
                : "Staff read messages during office hours."}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function Step({ state, last }: { state: "done" | "active" | "todo"; last: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {state === "done" ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand">
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        </span>
      ) : state === "active" ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-person bg-surface"><span className="h-2 w-2 rounded-full bg-person" /></span>
      ) : (
        <span className="h-7 w-7 shrink-0 rounded-full border-2 border-line bg-surface" />
      )}
      {!last && <span aria-hidden className="my-1 w-0.5 flex-1 bg-line" />}
    </div>
  );
}
