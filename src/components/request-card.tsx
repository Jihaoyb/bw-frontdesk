import type { KnowledgeEntry } from "@/lib/knowledge";
import type { StaffRequest } from "@/lib/requests";

export const statusLabel: Record<StaffRequest["status"], string> = {
  awaiting_review: "Awaiting review",
  staff_reviewing: "Staff reviewing",
  needs_your_reply: "Needs your reply",
  closed: "Closed",
};

export const originLabel: Record<StaffRequest["origin"], string> = {
  parent_initiated: "Parent asked for staff",
  handoff_offered: "Handoff offered",
  sensitive: "Sensitive",
};

// Three separate facts: known policy (may be none), the unresolved need, and
// staff progress. Saved does not mean reviewed; reviewed does not mean approved.
export function RequestCard({ request, knownPolicy }: { request: StaffRequest; knownPolicy: KnowledgeEntry | null }) {
  return (
    <article aria-label="Staff request" className="rounded-lg border border-stone-300 bg-white p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Staff request</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs" data-status={request.status}>{statusLabel[request.status]}</span>
      </div>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Known policy</dt>
          <dd>{knownPolicy ? <><span className="font-medium">{knownPolicy.title}.</span> {knownPolicy.policyText}</> : "No published policy covers this yet."}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Still needs staff</dt>
          <dd className="whitespace-pre-wrap">{request.question}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Staff progress</dt>
          <dd>
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
