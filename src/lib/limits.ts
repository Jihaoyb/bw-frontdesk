// Bounded input. Values are configuration, not constants.
function intFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const MAX_QUESTION_CHARS = intFromEnv("MAX_QUESTION_CHARS", 1000);
