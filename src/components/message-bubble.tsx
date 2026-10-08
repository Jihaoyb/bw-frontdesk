import { centerConfig } from "@/lib/center-config";
import type { Message } from "@/lib/requests";

export const messageTime = new Intl.DateTimeFormat("en-US", {
  timeZone: centerConfig.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

// Three visually distinct speakers: parent (dark), staff (amber, named), and
// automated front desk (white). A staff reply is a message to this family;
// it does not change published knowledge.
export function MessageBubble({ message, viewer }: { message: Message; viewer: "parent" | "operator" }) {
  const m = message;
  const who = m.speaker === "parent" ? (viewer === "parent" ? "You" : "Parent") : m.speaker === "staff" ? (m.staffName ?? "Staff") : "Front desk";
  const cls = m.speaker === "parent"
    ? "bg-stone-900 text-white"
    : m.speaker === "staff"
      ? "border-l-4 border-amber-500 bg-amber-50 text-stone-900"
      : "border border-stone-200 bg-white";
  return (
    <div className={"rounded-lg p-3 text-sm " + cls} data-speaker={m.speaker}>
      {m.speaker === "staff" && <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Staff reply</p>}
      <p className="whitespace-pre-wrap">{m.body}</p>
      <p className={"mt-1 text-xs " + (m.speaker === "parent" ? "text-stone-300" : "text-stone-500")}>
        {who} · <time dateTime={m.createdAt.toISOString()}>{messageTime.format(m.createdAt)}</time>
      </p>
    </div>
  );
}
