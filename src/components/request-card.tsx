import type { KnowledgeEntry } from "@/lib/knowledge";
import type { StaffRequest } from "@/lib/requests";

export const statusLabel: Record<StaffRequest["status"], string> = {
  awaiting_review: "Awaiting review",
  staff_reviewing: "Staff reviewing",
  needs_your_reply: "Needs your reply",
  closed: "Closed",
};

export const statusTone: Record<StaffRequest["status"], string> = {
  awaiting_review: "bg-stone-100 text-stone-700",
  staff_reviewing: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
  needs_your_reply: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  closed: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
};

export const originLabel: Record<StaffRequest["origin"], string> = {
  parent_initiated: "Parent asked for staff",
  handoff_offered: "Handoff offered",
  sensitive: "Sensitive",
};

export function StatusPill({ status }: { status: StaffRequest["status"] }) {
  return <span className={"pill " + statusTone[status]} data-status={status}>{statusLabel[status]}</span>;
}

// Three separate facts: known policy (may be none), the unresolved need, and
// staff progress. Saved does not mean reviewed; reviewed does not mean approved.
export function RequestCard({ request, knownPolicy }: { request: StaffRequest; knownPolicy: KnowledgeEntry | null }) {
  return (
    <article aria-label="Staff request" className="card overflow-hidden text-sm">
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/70 px-4 py-2.5">
        <h3 className="eyebrow">Staff request</h3>
        <StatusPill status={request.status} />
      </div>
      <dl className="space-y-3 px-4 py-3">
        <div>
          <dt className="eyebrow">Known policy</dt>
          <dd className="mt-0.5">{knownPolicy ? <><span className="font-medium">{knownPolicy.title}.</span> {knownPolicy.policyText}</> : <span className="text-stone-600">No published policy covers this yet.</span>}</dd>
        </div>
        <div>
          <dt className="eyebrow">Still needs staff</dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{request.question}</dd>
        </div>
        <div>
          <dt className="eyebrow">Staff progress</dt>
          <dd className="mt-0.5">
            {statusLabel[request.status]}.{" "}
            {request.status === "closed"
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
