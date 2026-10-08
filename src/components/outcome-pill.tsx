import type { InquiryOutcome } from "@/lib/inquiries";

export const outcomeLabel: Record<InquiryOutcome, string> = {
  chat: "Small talk",
  pending: "Answering",
  answered: "Answered",
  clarified: "Clarified",
  handoff_offered: "Handoff offered",
  sensitive: "Sensitive",
  failed: "Failed",
  staff_requested: "Sent to staff",
};

const tone: Record<InquiryOutcome, string> = {
  chat: "text-ink-3",
  pending: "text-ink-3",
  answered: "text-brand-deep",
  clarified: "text-ink-2",
  handoff_offered: "text-person-deep",
  sensitive: "text-alert",
  failed: "text-ink-2",
  staff_requested: "text-person-deep",
};

/** Outcome as two words in a color, no pill chrome: the history list is dense. */
export function OutcomePill({ outcome }: { outcome: InquiryOutcome }) {
  return <span className={"shrink-0 text-xs font-medium " + tone[outcome]} data-outcome={outcome}>{outcomeLabel[outcome]}</span>;
}
