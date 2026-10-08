import type { InquiryOutcome } from "@/lib/inquiries";

export const outcomeLabel: Record<InquiryOutcome, string> = {
  pending: "Answering",
  answered: "Answered",
  clarified: "Clarified",
  handoff_offered: "Handoff offered",
  sensitive: "Sensitive",
  failed: "Failed",
  staff_requested: "Sent to staff",
};

const tone: Record<InquiryOutcome, string> = {
  pending: "bg-stone-100 text-stone-600",
  answered: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
  clarified: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
  handoff_offered: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  sensitive: "bg-red-50 text-red-900 ring-1 ring-red-200",
  failed: "bg-stone-200 text-stone-800",
  staff_requested: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
};

export function OutcomePill({ outcome }: { outcome: InquiryOutcome }) {
  return <span className={"pill " + tone[outcome]} data-outcome={outcome}>{outcomeLabel[outcome]}</span>;
}
