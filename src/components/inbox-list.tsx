import Link from "next/link";
import type { KnowledgeEntry } from "@/lib/knowledge";
import { gapLabel, knowledgeGapState, type KnowledgeGapState } from "@/lib/knowledge-loop";
import type { StaffRequest } from "@/lib/requests";
import { messageTime } from "./message-bubble";
import { statusLabel } from "./request-card";

// Issue 014: the staff queue. Filter chips are links (server-rendered, no
// client state); each row carries a colored rail for the kind of attention it
// needs. Opening a request does not mark it reviewed.

// Issue 016: the inbox is the queue only. Open (default) is everything not
// closed; Needs action narrows to untouched requests; Closed is the rest.
export type InboxFilter = "action" | "open" | "closed";

export function needsAction(r: StaffRequest): boolean {
  return r.status === "awaiting_review";
}

export function applyFilter(requests: StaffRequest[], filter: InboxFilter): StaffRequest[] {
  if (filter === "action") return requests.filter(needsAction);
  if (filter === "closed") return requests.filter((r) => r.status === "closed");
  return requests.filter((r) => r.status !== "closed");
}

/** Default is Open. Anything unknown (including the old `all`) falls back to it. */
export function parseFilter(raw: string | undefined): InboxFilter {
  return raw === "action" || raw === "closed" ? raw : "open";
}

/** Queue counts for chips and the empty desktop column. */
export function queueCounts(requests: StaffRequest[]): { open: number; action: number; closed: number } {
  const closed = requests.filter((r) => r.status === "closed").length;
  return { open: requests.length - closed, action: requests.filter(needsAction).length, closed };
}

const rail: Record<StaffRequest["status"], string> = {
  awaiting_review: "bg-person",
  staff_reviewing: "bg-person/60",
  needs_your_reply: "bg-brand",
  closed: "bg-line",
};
const statusColor: Record<StaffRequest["status"], string> = {
  awaiting_review: "text-person-deep",
  staff_reviewing: "text-person-deep",
  needs_your_reply: "text-brand-deep",
  closed: "text-ink-3",
};
const gapTone: Record<KnowledgeGapState, string> = {
  none: "", gap: "bg-canvas text-ink-2 ring-1 ring-line", draft: "bg-person-soft text-person-deep", published: "bg-brand-soft text-brand-deep",
};

export function InboxList({
  requests, drafts, policies, counts, filter, activeId, basePath = "/operator/inbox",
}: {
  requests: StaffRequest[];
  drafts: Map<string, KnowledgeEntry | null>;
  policies: Map<string, KnowledgeEntry>;
  counts: Map<string, number>;
  filter: InboxFilter;
  activeId?: string;
  basePath?: string;
}) {
  // The request being viewed stays in the list whatever the filter says.
  const filtered = applyFilter(requests, filter);
  const shown = activeId && !filtered.some((r) => r.id === activeId) ? [...filtered, ...requests.filter((r) => r.id === activeId)] : filtered;
  const { open: nOpen, action: nAction, closed: nClosed } = queueCounts(requests);
  const chip = (f: InboxFilter, label: string) => (
    <Link href={`${basePath}?filter=${f}`} aria-current={filter === f ? "page" : undefined} className={"chip " + (filter === f ? "chip-on" : "")} data-filter={f}>
      {label}
    </Link>
  );
  return (
    <section aria-labelledby="inbox" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="inbox" className="text-[22px] font-semibold tracking-[-0.02em]">Inbox</h2>
        <p className="mono text-xs text-ink-3">{nOpen} open · {nAction} need action</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {chip("open", `Open · ${nOpen}`)}
        {chip("action", `Needs action · ${nAction}`)}
        {chip("closed", `Closed · ${nClosed}`)}
      </div>
      <p className="text-xs text-ink-3">Opening a request does not mark it reviewed.</p>
      {shown.length === 0 && <p className="card p-4 text-sm text-ink-3">{filter === "action" ? "Nothing needs action." : filter === "open" ? "No open requests." : "Nothing closed yet."}</p>}
      <ul className="flex flex-col gap-2.5">
        {shown.map((r) => {
          const gap = knowledgeGapState(r, drafts.get(r.id) ?? null);
          const policy = r.knownPolicyEntryId ? policies.get(r.knownPolicyEntryId) : null;
          const n = counts.get(r.id) ?? 1;
          const active = r.id === activeId;
          return (
            <li key={r.id}>
              <Link
                href={`/operator/inbox/${r.id}`}
                aria-current={active ? "page" : undefined}
                className={"card grid grid-cols-[4px_minmax(0,1fr)] gap-3.5 p-3.5 pl-3 text-sm transition hover:border-ink-3/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " + (active ? "border-ink" : "")}
                data-request-row={r.id}
              >
                <span aria-hidden className={"rounded-sm " + (r.origin === "sensitive" ? "bg-alert" : rail[r.status])} />
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="flex items-center gap-2 text-xs text-ink-3">
                    {r.origin === "sensitive"
                      ? <span className="font-medium text-alert" data-origin="sensitive">Sensitive</span>
                      : <span className={"font-medium " + statusColor[r.status]} data-status={r.status}>{statusLabel[r.status]}</span>}
                    <span>· {r.origin === "sensitive" ? statusLabel[r.status].toLowerCase() : r.origin === "handoff_offered" ? "handoff" : "asked for staff"} · {messageTime.format(r.createdAt)}</span>
                    {n > 1 && <span className="mono ml-auto" title={`${n} normalized matching questions`} data-matching={n}>×{n}</span>}
                  </span>
                  <span className="line-clamp-2 whitespace-pre-wrap text-base font-medium leading-[1.35]">{r.question}</span>
                  <span className="flex flex-wrap gap-1.5 text-xs">
                    {policy && <span className="pill bg-canvas text-ink-2 ring-1 ring-line">Policy: {policy.title}</span>}
                    {gap === "none"
                      ? <span className="text-ink-3">Not answered from policy. Handled by a person.</span>
                      : <span className={"pill " + gapTone[gap]} data-gap={gap}>{gapLabel[gap]}</span>}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
