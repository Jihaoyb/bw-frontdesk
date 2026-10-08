import { centerConfig } from "@/lib/center-config";
import type { Evidence } from "@/lib/inquiries";
import type { Message } from "@/lib/requests";
import { formatPublished } from "./policy-list";

export const messageTime = new Intl.DateTimeFormat("en-US", {
  timeZone: centerConfig.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

// Three visually distinct speakers: parent (dark, right), staff (amber, named),
// and the automated assistant (white, indigo mark, labeled AI). A staff reply is a message
// to this family; it does not change published knowledge.
export function MessageBubble({ message, viewer, sources = [] }: { message: Message; viewer: "parent" | "operator"; sources?: Evidence[] }) {
  const m = message;
  const mine = m.speaker === "parent" && viewer === "parent";
  const who = m.speaker === "parent" ? (mine ? "You" : "Parent") : m.speaker === "staff" ? (m.staffName ?? "Staff") : "AI assistant";
  const bubble = m.speaker === "parent"
    ? "bg-stone-900 text-white rounded-br-md"
    : m.speaker === "staff"
      ? "bg-amber-50 text-stone-900 ring-1 ring-amber-200 rounded-bl-md"
      : "bg-white text-stone-900 ring-1 ring-stone-200/80 shadow-card rounded-bl-md";
  return (
    <div className={"rise flex flex-col " + (mine ? "items-end" : "items-start")} data-speaker={m.speaker}>
      <div className="mb-1 flex items-center gap-1.5 px-1 text-xs text-stone-500">
        {m.speaker === "assistant" && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-brand" />}
        {m.speaker === "staff" && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
        <span className="font-medium text-stone-700">{who}</span>
        {m.speaker === "staff" && <span className="pill bg-amber-100 text-amber-900">Staff reply</span>}
        {m.speaker === "assistant" && <span className="pill bg-indigo-50 text-indigo-800">Automated</span>}
        <span aria-hidden>·</span>
        <time dateTime={m.createdAt.toISOString()}>{messageTime.format(m.createdAt)}</time>
      </div>
      <div className={"max-w-[92%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed " + bubble}>
        <p className="whitespace-pre-wrap">{m.body}</p>
      </div>
      {sources.length > 0 && <Sources sources={sources} />}
    </div>
  );
}

/** Clickable sources. Each reveals the exact published text the answer was based on, as saved at answer time. */
export function Sources({ sources }: { sources: Evidence[] }) {
  return (
    <div className="mt-1.5 flex max-w-[92%] flex-wrap gap-1.5" data-sources={sources.length}>
      {sources.map((s) => (
        <details key={s.id} className="group min-w-0">
          <summary className="pill cursor-pointer list-none bg-brand-soft text-indigo-800 ring-1 ring-indigo-100 hover:bg-indigo-100">
            <span aria-hidden>§</span> {s.title}
          </summary>
          <blockquote className="mt-1.5 rounded-xl border-l-2 border-indigo-300 bg-white p-3 text-sm leading-relaxed text-stone-800 ring-1 ring-stone-200/80">
            <p className="eyebrow mb-1">Exact published text</p>
            <p className="whitespace-pre-wrap">{s.policyText}</p>
            <p className="mt-2 text-xs text-stone-500">{formatPublished(s.publishedAt)}{s.entryId ? "" : " · entry since removed"}</p>
          </blockquote>
        </details>
      ))}
    </div>
  );
}
