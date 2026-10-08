// Issue 008: normalized matching-question counts. Pure text normalization, no
// semantics: two questions match only when they are the same words in the same
// order once capitalization, extra whitespace, and punctuation are ignored.
// Requests are never merged; the count is a label on the history list.

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ") // punctuation and symbols become spaces
    .replace(/\s+/g, " ")
    .trim();
}

/** Count of inquiries per normalized text. Callers pass one session's inquiries only. */
export function matchingCounts<T extends { question: string }>(items: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const it of items) {
    const key = normalizeQuestion(it.question);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** How many questions in the list match this one, including itself. */
export function matchCount<T extends { question: string }>(counts: Map<string, number>, item: T): number {
  return counts.get(normalizeQuestion(item.question)) ?? 1;
}
