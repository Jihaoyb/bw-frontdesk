import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId, resetSessionContent } from "@/lib/session";
import {
  createKnowledgeDraft,
  getKnowledgeEntry,
  listAllKnowledge,
  listPublishedKnowledge,
  publishKnowledge,
  saveKnowledgeDraft,
} from "@/lib/knowledge";
import { buildSystemPrompt, setModelCallerForTests, type ModelCaller } from "@/lib/answer-service";
import { askFrontDesk, listEvidence } from "@/lib/inquiries";
import { readUsage } from "@/lib/usage";
import { seedKnowledge } from "@/lib/seed-knowledge";
import { getPool } from "@/lib/db";
import { closePool, deleteSessions } from "./helpers";

// Issue 006: create, edit, publish knowledge. Draft exclusion, explicit
// publication improving a later answer, evidence preserved, reset behavior.

const created: string[] = [];
const testDays: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
const DAY = (() => {
  const d = new Date(Date.UTC(1850 + Math.floor(Math.random() * 40), 0, 1) + Math.floor(Math.random() * 300) * 86400000).toISOString().slice(0, 10);
  testDays.push(d);
  return d;
})();

const I03 = "Are you open on Veterans Day?";
const VETERANS = " Veterans Day (November 11, 2026).";

/** Deterministic stand-in for the model: answers from K2 only if the grounding text mentions Veterans Day. */
const veteransAware: ModelCaller = async ({ system }) => {
  const k2 = system.match(/\[([0-9a-f-]{36})\] Holiday closures/)?.[1];
  if (system.includes("Veterans Day") && k2) {
    return { kind: "answer", text: "The center is closed on Veterans Day, November 11, 2026.", source_ids: [k2], contact_staff: false };
  }
  return { kind: "handoff", text: "The published closures do not mention Veterans Day. Staff can confirm.", source_ids: k2 ? [k2] : [], contact_staff: false };
};

afterEach(() => setModelCallerForTests(null));
afterAll(async () => {
  await deleteSessions(created);
  if (testDays.length) await getPool().query("DELETE FROM usage_daily WHERE day = ANY($1::date[])", [testDays]);
  await closePool();
});

describe("knowledge drafts and publication", () => {
  it("a new entry is a draft: it persists across refresh but is not published or grounding material", async () => {
    const s = await openSession();
    const r = await createKnowledgeDraft(s.id, { title: "Sunscreen", policyText: "Families apply sunscreen before drop-off." });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.publishedAt).toBeNull();
    expect(r.entry.draft?.title).toBe("Sunscreen");
    // "refresh": re-read from the database
    const all = await listAllKnowledge(s.id);
    expect(all.find((e) => e.id === r.entry.id)?.title).toBe("Sunscreen");
    const published = await listPublishedKnowledge(s.id);
    expect(published.map((e) => e.id)).not.toContain(r.entry.id);
    expect(published).toHaveLength(seedKnowledge.length);
    expect(buildSystemPrompt(published)).not.toContain("Sunscreen");
    // explicit publication makes it visible, with a timestamp
    const p = await publishKnowledge(s.id, r.entry.id);
    expect(p.ok && p.entry.publishedAt).toBeInstanceOf(Date);
    expect((await listPublishedKnowledge(s.id)).map((e) => e.title)).toContain("Sunscreen");
    expect(buildSystemPrompt(await listPublishedKnowledge(s.id))).toContain("Sunscreen");
  });

  it("editing a published entry keeps the old text live until Publish; another session is unaffected", async () => {
    const a = await openSession();
    const b = await openSession();
    const k2 = (await listPublishedKnowledge(a.id)).find((e) => e.seedKey === "K2")!;
    const edited = await saveKnowledgeDraft(a.id, k2.id, { title: k2.title, policyText: k2.policyText + VETERANS });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.entry.publishedAt?.getTime()).toBe(k2.publishedAt?.getTime());
    expect(edited.entry.policyText).toBe(k2.policyText); // published text unchanged
    expect(edited.entry.draft?.policyText).toContain("Veterans Day");
    const liveA = (await listPublishedKnowledge(a.id)).find((e) => e.id === k2.id)!;
    expect(liveA.policyText).not.toContain("Veterans Day");
    expect(buildSystemPrompt(await listPublishedKnowledge(a.id))).not.toContain("Veterans Day");

    const p = await publishKnowledge(a.id, k2.id);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.entry.policyText).toContain("Veterans Day");
    expect(p.entry.draft).toBeNull();
    expect(p.entry.publishedAt!.getTime()).toBeGreaterThan(k2.publishedAt!.getTime());
    expect((await listPublishedKnowledge(a.id)).find((e) => e.id === k2.id)!.policyText).toContain("Veterans Day");

    const k2b = (await listPublishedKnowledge(b.id)).find((e) => e.seedKey === "K2")!;
    expect(k2b.policyText).not.toContain("Veterans Day");
    expect(k2b.draft).toBeNull();
    // cross-session writes are rejected
    expect(await saveKnowledgeDraft(b.id, k2.id, { title: "x", policyText: "y" })).toEqual({ ok: false, error: "not_found" });
    expect(await publishKnowledge(b.id, k2.id)).toEqual({ ok: false, error: "not_found" });
    // publishing with no draft is a no-op error, not a silent republish
    expect(await publishKnowledge(a.id, k2.id)).toEqual({ ok: false, error: "nothing_to_publish" });
  });

  it("explicit publication improves a later answer, and the earlier answer keeps the evidence it cited", async () => {
    const s = await openSession();
    setModelCallerForTests(veteransAware);
    const before = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I03 });
    expect(before.status).toBe("handoff_offered");
    if (before.status !== "handoff_offered") return;
    const original = before.sources[0];
    expect(original.policyText).not.toContain("Veterans Day");

    const k2 = (await listPublishedKnowledge(s.id)).find((e) => e.seedKey === "K2")!;
    await saveKnowledgeDraft(s.id, k2.id, { title: k2.title, policyText: k2.policyText + VETERANS });
    // draft alone changes nothing
    const stillGap = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I03 });
    expect(stillGap.status).toBe("handoff_offered");

    await publishKnowledge(s.id, k2.id);
    const after = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I03 });
    expect(after.status).toBe("answered");
    if (after.status !== "answered") return;
    expect(after.sources[0].entryId).toBe(k2.id);
    expect(after.sources[0].policyText).toContain("Veterans Day");

    // history: the first answer still shows exactly what it cited
    const evidence = await listEvidence(s.id);
    const first = evidence.get(before.message.id)![0];
    expect(first.policyText).toBe(original.policyText);
    expect(first.publishedAt?.getTime()).toBe(original.publishedAt?.getTime());
    expect(first.entryId).toBe(k2.id);
  });

  it("reset restores seeded knowledge, removes session-created entries, and keeps usage accounting", async () => {
    const s = await openSession();
    setModelCallerForTests(veteransAware);
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I03 });
    const usedBefore = (await readUsage(s.id, { day: DAY })).sessionUsed;
    expect(usedBefore).toBe(1);

    const k2 = (await listPublishedKnowledge(s.id)).find((e) => e.seedKey === "K2")!;
    await saveKnowledgeDraft(s.id, k2.id, { title: k2.title, policyText: k2.policyText + VETERANS });
    await publishKnowledge(s.id, k2.id);
    const custom = await createKnowledgeDraft(s.id, { title: "Sunscreen", policyText: "Families apply sunscreen before drop-off." });
    if (!custom.ok) throw new Error(custom.error);
    await publishKnowledge(s.id, custom.entry.id);

    await resetSessionContent(s.id);
    const all = await listAllKnowledge(s.id);
    expect(all.map((e) => e.seedKey)).toEqual(seedKnowledge.map((k) => k.key));
    expect(all.map((e) => e.policyText)).toEqual(seedKnowledge.map((k) => k.policyText));
    expect(all.every((e) => e.draft === null && e.publishedAt instanceof Date)).toBe(true);
    expect(await getKnowledgeEntry(s.id, custom.entry.id)).toBeNull();
    expect((await readUsage(s.id, { day: DAY })).sessionUsed).toBe(usedBefore);
  });
});
