import { afterAll, describe, expect, it } from "vitest";
import { ensureSession, newSessionId, resetSessionContent } from "@/lib/session";
import { getKnowledgeEntry, listPublishedKnowledge } from "@/lib/knowledge";
import { seedKnowledge } from "@/lib/seed-knowledge";
import { getPool } from "@/lib/db";
import { closePool, deleteSessions } from "./helpers";

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

describe("demo session: seed, persistence, isolation, reset", () => {
  it("seeds K1–K10 verbatim and in order on first open", async () => {
    const s = await openSession();
    const entries = await listPublishedKnowledge(s.id);
    expect(entries.map((e) => e.seedKey)).toEqual(seedKnowledge.map((k) => k.key));
    expect(entries.map((e) => e.title)).toEqual(seedKnowledge.map((k) => k.title));
    expect(entries.map((e) => e.policyText)).toEqual(seedKnowledge.map((k) => k.policyText));
    for (const e of entries) expect(e.publishedAt).toBeInstanceOf(Date);
    // deliberate gaps stay gaps
    const all = entries.map((e) => e.policyText).join(" ");
    expect(all).not.toMatch(/Veterans Day|Presidents/);
  });

  it("re-opening the same session id (refresh) returns the same state, not a new seed", async () => {
    const s = await openSession();
    const again = await ensureSession(s.id);
    expect(again.id).toBe(s.id);
    expect(again.createdAt.getTime()).toBe(s.createdAt.getTime());
    const entries = await listPublishedKnowledge(s.id);
    expect(entries).toHaveLength(seedKnowledge.length);
    const ids = new Set(entries.map((e) => e.id));
    expect(ids.size).toBe(seedKnowledge.length);
  });

  it("a second session cannot read the first session's entries, even by id", async () => {
    const a = await openSession();
    const b = await openSession();
    const [aEntry] = await listPublishedKnowledge(a.id);
    expect(await getKnowledgeEntry(a.id, aEntry.id)).not.toBeNull();
    expect(await getKnowledgeEntry(b.id, aEntry.id)).toBeNull();
    const bEntries = await listPublishedKnowledge(b.id);
    expect(bEntries.map((e) => e.id)).not.toContain(aEntry.id);
    expect(await getKnowledgeEntry(b.id, "not-a-uuid")).toBeNull();
  });

  it("reset restores only the active session's starting content and keeps its identity", async () => {
    const a = await openSession();
    const b = await openSession();
    // simulate an operator edit in session a (later issues own the real edit path)
    const [k2] = (await listPublishedKnowledge(a.id)).filter((e) => e.seedKey === "K2");
    await getPool().query("UPDATE knowledge_entries SET policy_text = policy_text || ' Veterans Day (November 11, 2026).' WHERE id = $1 AND session_id = $2", [k2.id, a.id]);
    await getPool().query("UPDATE knowledge_entries SET title = 'edited in b' WHERE session_id = $1 AND seed_key = 'K1'", [b.id]);

    const before = await ensureSession(a.id);
    const after = await resetSessionContent(a.id);
    expect(after.id).toBe(a.id);
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
    expect(after.resetCount).toBe(before.resetCount + 1);

    const aEntries = await listPublishedKnowledge(a.id);
    expect(aEntries.map((e) => e.policyText)).toEqual(seedKnowledge.map((k) => k.policyText));
    expect(aEntries.map((e) => e.id)).not.toContain(k2.id); // old ids gone, fresh seed

    const bEntries = await listPublishedKnowledge(b.id);
    expect(bEntries.find((e) => e.seedKey === "K1")?.title).toBe("edited in b"); // untouched
  });

  it("rejects malformed session ids before touching the database", async () => {
    await expect(ensureSession("../etc/passwd")).rejects.toThrow(/invalid session id/);
    await expect(resetSessionContent("")).rejects.toThrow(/invalid session id/);
  });
});
