// Bounded input, output, and allowances. Values are configuration, not constants.
function intFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const MAX_QUESTION_CHARS = intFromEnv("MAX_QUESTION_CHARS", 1000);
/** Longest answer text accepted from the model; longer output is treated as a failure. */
export const MAX_ANSWER_CHARS = intFromEnv("MAX_ANSWER_CHARS", 1500);
/** Output token cap sent to the model. */
export const MAX_ANSWER_TOKENS = intFromEnv("MAX_ANSWER_TOKENS", 500);
/** How long one model call may take before it counts as a failure. */
export const MODEL_TIMEOUT_MS = intFromEnv("MODEL_TIMEOUT_MS", 20000);
/** Operator knowledge editor bounds. */
export const MAX_POLICY_TITLE_CHARS = intFromEnv("MAX_POLICY_TITLE_CHARS", 120);
export const MAX_POLICY_TEXT_CHARS = intFromEnv("MAX_POLICY_TEXT_CHARS", 3000);
/** Conversation turns (parent + front desk only) sent as context. */
export const CONTEXT_TURNS = intFromEnv("CONTEXT_TURNS", 6);

/** AI requests allowed per demo session (survives content reset). */
export const AI_SESSION_LIMIT = intFromEnv("AI_SESSION_LIMIT", 50);
/** AI requests allowed across all sessions per UTC calendar day. */
export const AI_DAILY_LIMIT = intFromEnv("AI_DAILY_LIMIT", 500);
/** Gate: public model access stays off until usage enforcement is verified. */
export const AI_ANSWERS_ENABLED = process.env.AI_ANSWERS_ENABLED === "true";
