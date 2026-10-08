// Issue 016: pairing the session's questions with how the front desk handled
// them, for the read-only Questions thread. Pure; the page supplies the rows.
import type { Inquiry, InquiryOutcome } from "./inquiries";

/** The inquiry behind each parent message, keyed by that message's id. A question without an inquiry (a staff-request follow-up) has none. */
export function inquiryByQuestion(inquiries: Inquiry[]): Map<string, Inquiry> {
  return new Map(inquiries.filter((i) => i.questionMessageId).map((i) => [i.questionMessageId as string, i]));
}

/** How many questions ended in each outcome. */
export function outcomeCounts(inquiries: Inquiry[]): Record<InquiryOutcome, number> {
  const out: Record<InquiryOutcome, number> = { chat: 0, pending: 0, answered: 0, clarified: 0, handoff_offered: 0, sensitive: 0, failed: 0, staff_requested: 0 };
  for (const i of inquiries) out[i.outcome] += 1;
  return out;
}
