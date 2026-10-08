import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId, resetSessionContent } from "@/lib/session";
import { listInquiries } from "@/lib/inquiries";
import { createStaffRequest } from "@/lib/requests";
import { matchCount, matchingCounts, normalizeQuestion } from "@/lib/matching";
import { closePool, deleteSessions } from "./helpers";

// Issue 008: I22 variants. Matching is textual normalization only; requests stay individual.

const created: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
afterAll(async () => {
  await deleteSessions(created);
  await closePool();
});

const I03 = "Are you open on Veterans Day?";
const MATCHING = ["are you open on veterans day?", "Are you open on Veterans Day", "ARE YOU OPEN  on veterans day!!"];
const DISTINCT = "Open on Veterans Day or no?";

describe("normalized matching", () => {
  it("ignores capitalization, extra whitespace, and punctuation; keeps different wording distinct", () => {
    for (const v of MATCHING) expect(normalizeQuestion(v)).toBe(normalizeQuestion(I03));
    expect(normalizeQuestion(DISTINCT)).not.toBe(normalizeQuestion(I03));
    expect(normalizeQuestion("What time is lunch?")).not.toBe(normalizeQuestion("When is lunch?")); // no synonyms
    expect(normalizeQuestion("  Hola,   ¿están abiertos?  ")).toBe("hola están abiertos");
    const counts = matchingCounts([I03, ...MATCHING, DISTINCT].map((question) => ({ question })));
    expect(matchCount(counts, { question: I03 })).toBe(4);
    expect(matchCount(counts, { question: DISTINCT })).toBe(1);
  });

  it("counts come from the active session's history only, keep every request separate, and reset with content", async () => {
    const a = await openSession();
    const b = await openSession();
    const ids: string[] = [];
    for (const question of [I03, ...MATCHING, DISTINCT]) {
      const { request } = await createStaffRequest(a.id, { submissionId: randomUUID(), question, origin: "parent_initiated" });
      ids.push(request.id);
    }
    await createStaffRequest(b.id, { submissionId: randomUUID(), question: I03, origin: "parent_initiated" }); // other session
    expect(new Set(ids).size).toBe(5); // five requests, none merged

    const history = await listInquiries(a.id); // refresh = re-read
    expect(history).toHaveLength(5);
    const counts = matchingCounts(history);
    expect(history.filter((q) => matchCount(counts, q) === 4)).toHaveLength(4);
    expect(matchCount(counts, history.find((q) => q.question === DISTINCT)!)).toBe(1);
    expect(new Set(history.map((q) => q.requestId)).size).toBe(5); // each question still points at its own request

    const other = matchingCounts(await listInquiries(b.id));
    expect(matchCount(other, { question: I03 })).toBe(1);

    await resetSessionContent(a.id);
    expect(await listInquiries(a.id)).toHaveLength(0);
    expect(matchCount(matchingCounts(await listInquiries(b.id)), { question: I03 })).toBe(1);
  });
});
