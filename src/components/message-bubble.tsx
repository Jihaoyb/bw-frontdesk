import { centerConfig } from "@/lib/center-config";
import type { Evidence } from "@/lib/inquiries";
import type { Message } from "@/lib/requests";
import { formatPublished } from "./policy-list";

export const messageTime = new Intl.DateTimeFormat("en-US", {
  timeZone: centerConfig.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

// Issue 014: only the parent gets a bubble. The assistant speaks as plain text
// under a green dot labeled AI; a staff reply is amber and named. A staff reply
// is a message to this family; it does not change published knowledge.
export function MessageBubble({ message, viewer, sources = [] }: { message: Message; viewer: "parent" | "operator"; sources?: Evidence[] }) {
  const m = message;
  const mine = m.speaker === "parent" && viewer === "parent";
  const who = m.speaker === "parent" ? (mine ? "You" : "Parent") : m.speaker === "staff" ? (m.staffName ?? "Staff") : "AI assistant";
  const time = <time dateTime={m.createdAt.toISOString()}>{messageTime.format(m.createdAt)}</time>;

  if (m.speaker === "parent") {
    return (
      <div className={"rise flex flex-col gap-1 " + (mine ? "items-end" : "items-start")} data-speaker="parent">
        <div className="px-1 text-xs text-ink-3"><span className="font-medium text-ink">{who}</span> · {time}</div>
        <div className={"max-w-[82%] rounded-[20px] bg-ink px-4 py-3 text-base leading-[1.4] text-white " + (mine ? "rounded-br-md" : "rounded-bl-md")}>
          <p className="whitespace-pre-wrap">{m.body}</p>
        </div>
      </div>
    );
  }

  if (m.speaker === "staff") {
    return (
      <div className="rise flex max-w-[92%] flex-col gap-2" data-speaker="staff">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span aria-hidden className="h-2 w-2 rounded-full bg-person" />
          <span className="font-medium text-ink">{who}</span>
          <span className="pill bg-person-soft text-person-deep">Staff reply</span>
          <span aria-hidden>·</span>{time}
        </div>
        <div className="rounded-2xl border border-[#f1e3c2] bg-[#fffbef] px-4 py-3 text-base leading-[1.45]">
          <p className="whitespace-pre-wrap">{m.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rise flex max-w-[92%] flex-col gap-2.5" data-speaker="assistant">
      <div className="flex items-center gap-2 text-xs text-ink-3">
        <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
        <span className="font-medium text-ink">{who}</span>
        <span>· automated ·</span>{time}
      </div>
      <p className="measure whitespace-pre-wrap">{m.body}</p>
      {sources.length > 0 && <Sources sources={sources} />}
    </div>
  );
}

/** Source rows under an answer. Each opens in place to the exact published text the answer was based on, as saved at answer time. */
export function Sources({ sources }: { sources: Evidence[] }) {
  return (
    <div className="flex flex-col gap-2" data-sources={sources.length}>
      {sources.map((s) => (
        <details key={s.id} className="card overflow-hidden" data-source-id={s.entryId ?? "removed"}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand"><path d="M6 3h9l5 5v13H6z" /><path d="M14 3v6h6" /></svg>
            <span className="min-w-0 flex-1 truncate"><span className="text-ink-3">Source</span>&ensp;{s.title}</span>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev shrink-0 text-ink-3"><path d="M6 9l6 6 6-6" /></svg>
          </summary>
          <div className="reveal">
            <blockquote className="m-0 flex flex-col gap-2 px-3.5 pb-3.5">
              <p className="eyebrow">Exact published text</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{s.policyText}</p>
              <p className="mono text-[11px] text-ink-3">{formatPublished(s.publishedAt)} · as cited at answer time{s.entryId ? "" : " · entry since removed"}</p>
            </blockquote>
          </div>
        </details>
      ))}
    </div>
  );
}
