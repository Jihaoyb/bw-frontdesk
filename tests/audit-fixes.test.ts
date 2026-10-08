import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId } from "@/lib/session";
import { getKnowledgeEntry, listPublishedKnowledge, publishKnowledge, saveKnowledgeDraft } from "@/lib/knowledge";
import { setModelCallerForTests } from "@/lib/answer-service";
import { askFrontDesk, isStalePending, listInquiries, STALE_PENDING_MS } from "@/lib/inquiries";
import { createStaffRequest, listContextBeforeRequest, listRequestMessages, parentReply, staffReply } from "@/lib/requests";
import { normalizeQuestion } from "@/lib/matching";
import { getPool } from "@/lib/db";
import { closePool, deleteSessions } from "./helpers";

// Fixes from the post-008 audit. Each test reproduces the defect's trigger and
// asserts the behavior the original ticket promised.

const created: string[] = [];
const testDays: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
const DAY = (() => {
  const d = new Date(Date.UTC(1600 + Math.floor(Math.random() * 40), 0, 1) + Math.floor(Math.random() * 300) * 86400000).toISOString().slice(0, 10);
  testDays.push(d);
  return d;
})();
const I01 = "What are your holiday closures?";
const I08 = "What's the policy?";

afterEach(() => setModelCallerForTests(null));
afterAll(async () => {
  await deleteSessions(created);
  if (testDays.length) await getPool().query("DELETE FROM usage_daily WHERE day = ANY($1::date[])", [testDays]);
  await closePool();
});

describe("audit fixes", () => {
  it("1. more concurrent duplicate submissions than pool connections still complete with one request", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    const n = 8; // pool max is 5; before the fix each loser held one client while waiting for a second
    const guard = new Promise<"stalled">((resolve) => setTimeout(() => resolve("stalled"), 20_000));
    const all = Promise.all(Array.from({ length: n }, () => createStaffRequest(s.id, { submissionId, question: I01, origin: "parent_initiated" })));
    const outcome = await Promise.race([all, guard]);
    expect(outcome).not.toBe("stalled");
    const results = outcome as Awaited<typeof all>;
    expect(new Set(results.map((r) => r.request.id)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    // same shape for the ask path
    const ask = randomUUID();
    setModelCallerForTests(async () => ({ kind: "clarify", text: "Which one?", source_ids: [], contact_staff: false }));
    const asks = await Promise.race([Promise.all(Array.from({ length: n }, () => askFrontDesk(s.id, { usageDay: DAY, submissionId: ask, question: I08 }))), guard]);
    expect(asks).not.toBe("stalled");
  }, 45_000);

  it("3. an abandoned pending claim becomes retryable after the model timeout; a fresh one stays in flight", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    let calls = 0;
    setModelCallerForTests(async () => { calls++; return { kind: "answer", text: "Closed those days.", source_ids: [], contact_staff: false }; });
    // simulate a claim whose process died: pending, never finished
    const conv = await getPool().query("SELECT id FROM conversations WHERE session_id = $1 AND is_active", [s.id]);
    await getPool().query(
      `INSERT INTO inquiries (session_id, conversation_id, submission_id, question, outcome, updated_at) VALUES ($1, $2, $3, $4, 'pending', now())`,
      [s.id, conv.rows[0].id, submissionId, I01]);
    const fresh = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I01 });
    expect(fresh.status).toBe("pending"); // someone else is still working on it
    expect(calls).toBe(0);
    await getPool().query("UPDATE inquiries SET updated_at = now() - ($2::int * interval '1 millisecond') WHERE session_id = $1", [s.id, STALE_PENDING_MS + 1000]);
    const row = (await listInquiries(s.id))[0];
    expect(isStalePending(row)).toBe(true);
    setModelCallerForTests(async () => { calls++; return { kind: "handoff", text: "Not listed. Staff can confirm.", source_ids: [], contact_staff: false }; });
    const retried = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I01 });
    expect(retried.status).toBe("handoff_offered");
    expect(calls).toBe(1);
    expect(isStalePending((await listInquiries(s.id))[0])).toBe(false);
  });

  it("4. publishing sends the reviewed text in one statement; a draft saved by another tab in between cannot slip through", async () => {
    const s = await openSession();
    const k4 = (await listPublishedKnowledge(s.id)).find((e) => e.seedKey === "K4")!;
    const reviewed = { title: k4.title, policyText: k4.policyText + " Snack at 3:00 p.m." };
    await saveKnowledgeDraft(s.id, k4.id, reviewed); // tab 1 saves what it reviewed
    await saveKnowledgeDraft(s.id, k4.id, { title: k4.title, policyText: "Lunch is at noon." }); // tab 2 overwrites the draft
    const p = await publishKnowledge(s.id, k4.id, reviewed); // tab 1 publishes what it saw
    expect(p.ok && p.entry.policyText).toBe(reviewed.policyText);
    const live = (await getKnowledgeEntry(s.id, k4.id))!;
    expect(live.policyText).toBe(reviewed.policyText);
    expect(live.draft).toBeNull(); // tab 2's unreviewed text did not go live and is not lingering as "the" draft
    expect(await publishKnowledge(s.id, k4.id, { title: "", policyText: "x" })).toEqual({ ok: false, error: "invalid_title" });
  });

  it("2. staff see the conversation before a request: the clarification exchange, not just the tagged question", async () => {
    const s = await openSession();
    setModelCallerForTests(async () => ({ kind: "clarify", text: "Which policy do you mean: hours, closures, illness, meals, or billing?", source_ids: [], contact_staff: false }));
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I08 });
    setModelCallerForTests(async () => ({ kind: "handoff", text: "Veterans Day is not listed. Staff can confirm.", source_ids: [], contact_staff: false }));
    const sub = randomUUID();
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: sub, question: "November 11" });
    const { request } = await createStaffRequest(s.id, { submissionId: sub, question: "November 11", origin: "handoff_offered" });
    const tagged = await listRequestMessages(s.id, request.id);
    expect(tagged.map((m) => m.body)).toEqual(["November 11"]);
    const context = await listContextBeforeRequest(s.id, request.id);
    expect(context.map((m) => [m.speaker, m.body])).toEqual([
      ["parent", I08],
      ["assistant", "Which policy do you mean: hours, closures, illness, meals, or billing?"],
    ]);
    // the request's own answer is not "before" it; another session sees nothing
    const other = await openSession();
    expect(await listContextBeforeRequest(other.id, request.id)).toEqual([]);
  });

  it("6. a reply retried with the same submission id is saved once (parent and staff)", async () => {
    const s = await openSession();
    const { request } = await createStaffRequest(s.id, { submissionId: randomUUID(), question: I01, origin: "parent_initiated" });
    const pid = randomUUID();
    const a = await parentReply(s.id, request.id, "Any update?", pid);
    const b = await parentReply(s.id, request.id, "Any update?", pid);
    expect(a.ok && b.ok && a.message?.id === b.message?.id).toBe(true);
    const sid = randomUUID();
    const [c, d] = await Promise.all([
      staffReply(s.id, request.id, { staffName: "Dana R.", body: "Checking.", outcome: "reply", submissionId: sid }),
      staffReply(s.id, request.id, { staffName: "Dana R.", body: "Checking.", outcome: "reply", submissionId: sid }),
    ]);
    expect(c.ok && d.ok && c.message?.id === d.message?.id).toBe(true);
    const msgs = await listRequestMessages(s.id, request.id);
    expect(msgs.filter((m) => m.body === "Any update?")).toHaveLength(1);
    expect(msgs.filter((m) => m.body === "Checking.")).toHaveLength(1);
    // no id: two distinct messages, as before
    await parentReply(s.id, request.id, "Still here");
    await parentReply(s.id, request.id, "Still here");
    expect((await listRequestMessages(s.id, request.id)).filter((m) => m.body === "Still here")).toHaveLength(2);
  });

  it("8. apostrophes do not split words: What's / Whats match; other punctuation still separates", () => {
    expect(normalizeQuestion("What's for lunch?")).toBe(normalizeQuestion("Whats for lunch"));
    expect(normalizeQuestion("What’s for lunch?")).toBe("whats for lunch");
    expect(normalizeQuestion("open on veterans day!!")).toBe("open on veterans day");
    expect(normalizeQuestion("What's for lunch?")).not.toBe(normalizeQuestion("What is for lunch?"));
  });
});
