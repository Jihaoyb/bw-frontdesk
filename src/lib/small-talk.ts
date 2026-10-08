// Exact whole-message matches only: never swallow a policy question or staff request.
export function smallTalkReply(question: string): string | null {
  const text = question.trim().toLowerCase().replace(/[.!?]+$/u, "").trim();
  if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].includes(text))
    return "Hi! What would you like to know about the center?";
  if (["thanks", "thank you", "thanks a lot"].includes(text)) return "You're welcome!";
  if (["ok", "okay", "got it"].includes(text)) return "Got it. You can ask another question whenever you need.";
  return null;
}
