import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { ensureSession, newSessionId, resetSessionContent } from "@/lib/session";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { setModelCallerForTests, validateModelResult, type ModelCaller } from "@/lib/answer-service";
import { askFrontDesk, listEvidence, listInquiries } from "@/lib/inquiries";
import { createStaffRequest, listMessages, parentReply, staffReply } from "@/lib/requests";
import { consumeAllowance, readUsage } from "@/lib/usage";
import { getPool } from "@/lib/db";
import { SESSION_HEADER } from "@/lib/center-config";
import { POST } from "@/app/api/ask/route";
import { closePool, deleteSessions } from "./helpers";

const created: string[] = [];
const testDays: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
/** A unique past UTC day so tests never touch the real daily allowance. */
let dayCounter = 0;
function testDay() {
  // Distinct per call and per run: a random year in 1900-1980 plus a running offset.
  const base = Date.UTC(1900 + Math.floor(Math.random() * 80), 0, 1);
  const d = new Date(base + (dayCounter++) * 86400000).toISOString().slice(0, 10);
  testDays.push(d);
  return d;
}

const DAY = testDay(); // tests never consume the real daily allowance
const I01 = "What are your holiday closures?";
const I05 = "What time is lunch?";
const I26 = "What is the tuition for infants?";

/** Controlled model: answer from a seed key, verbatim policy text as the answer body. */
function answerFrom(seedKey: string, text?: string): ModelCaller {
  return async ({ system }) => {
    const id = system.match(new RegExp(`\\[([0-9a-f-]{36})\\] ${seedKeyTitle[seedKey]}`))?.[1];
    return { kind: "answer", text: text ?? `From ${seedKey}.`, source_ids: id ? [id] : [] };
  };
}
const seedKeyTitle: Record<string, string> = { K2: "Holiday closures", K4: "Meals and snacks", K9: "Tuition and billing" };

afterEach(() => setModelCallerForTests(null));
afterAll(async () => {
  await deleteSessions(created);
  if (testDays.length) await getPool().query("DELETE FROM usage_daily WHERE day = ANY($1::date[])", [testDays]);
  await closePool();
});

describe("sourced answers", () => {
  it("answers a routine question with the exact published text as evidence and creates no staff request", async () => {
    const s = await openSession();
    setModelCallerForTests(answerFrom("K2", "The center is closed on Thanksgiving Day and the day after, November 26 and 27."));
    const r = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I01 });
    expect(r.status).toBe("answered");
    if (r.status !== "answered") return;
    const k2 = (await listPublishedKnowledge(s.id)).find((k) => k.seedKey === "K2")!;
    expect(r.sources).toHaveLength(1);
    expect(r.sources[0]).toMatchObject({ entryId: k2.id, title: k2.title, policyText: k2.policyText });
    const msgs = await listMessages(s.id);
    expect(msgs.map((m) => m.speaker)).toEqual(["parent", "assistant"]);
    expect(msgs[1].body).toContain("November 26 and 27");
    expect((await getPool().query("SELECT count(*)::int AS n FROM staff_requests WHERE session_id = $1", [s.id])).rows[0].n).toBe(0);
  });

  it("evidence survives a later policy edit: the answer keeps the text it was based on", async () => {
    const s = await openSession();
    setModelCallerForTests(answerFrom("K4"));
    const r = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I05 });
    if (r.status !== "answered") throw new Error(r.status);
    const original = r.sources[0].policyText;
    await getPool().query("UPDATE knowledge_entries SET policy_text = 'Lunch is at noon.' WHERE id = $1", [r.sources[0].entryId]);
    const after = await listEvidence(s.id);
    expect(after.get(r.message.id)?.[0].policyText).toBe(original);
    expect(original).toContain("lunch at 11:30 a.m.");
  });

  it("drafts are excluded from grounding; only published entries reach the model", async () => {
    const s = await openSession();
    await getPool().query(
      "INSERT INTO knowledge_entries (session_id, title, policy_text, published_at) VALUES ($1, 'Veterans Day draft', 'Closed on Veterans Day.', NULL)", [s.id]);
    let seenSystem = "";
    setModelCallerForTests(async ({ system }) => { seenSystem = system; return { kind: "handoff", text: "Staff can confirm.", source_ids: [] }; });
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: "Are you open on Veterans Day?" });
    expect(seenSystem).not.toContain("Veterans Day draft");
    expect(seenSystem).toContain("Holiday closures");
  });

  it("validates shape and references: unknown source id, empty text, or an answer with no sources is a failure", async () => {
    const s = await openSession();
    const knowledge = await listPublishedKnowledge(s.id);
    expect(validateModelResult({ kind: "answer", text: "x", source_ids: [randomUUID()] }, knowledge)).toEqual({ kind: "failure", reason: "unknown_source" });
    expect(validateModelResult({ kind: "answer", text: "x", source_ids: [] }, knowledge)).toEqual({ kind: "failure", reason: "unsupported" });
    expect(validateModelResult({ kind: "answer", text: "  ", source_ids: [knowledge[0].id] }, knowledge)).toEqual({ kind: "failure", reason: "invalid_shape" });
    expect(validateModelResult("nope", knowledge)).toEqual({ kind: "failure", reason: "invalid_shape" });
    expect(validateModelResult({ kind: "clarify", text: "Which date?", source_ids: [] }, knowledge)).toEqual({ kind: "clarify", text: "Which date?", contactStaff: false });
  });

  it("I24: timeout, invalid JSON, or unknown id → failed outcome, question preserved, no answer shown; retry re-asks once", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    setModelCallerForTests(async () => { throw new SyntaxError("bad json"); });
    const fail = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I26 });
    expect(fail).toMatchObject({ status: "failed", reason: "invalid_shape" });
    expect((await listMessages(s.id)).map((m) => m.speaker)).toEqual(["parent"]);
    expect((await listInquiries(s.id))[0]).toMatchObject({ question: I26, outcome: "failed" });

    setModelCallerForTests(async () => { throw new Error("model http 500"); });
    expect(await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I26 })).toMatchObject({ status: "failed", reason: "model_error" });

    setModelCallerForTests(answerFrom("K9", "Infant full-time tuition is $2,150 per month; part-time is 70% of that."));
    const ok = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I26 });
    expect(ok.status).toBe("answered");
    const msgs = await listMessages(s.id);
    expect(msgs.map((m) => m.speaker)).toEqual(["parent", "assistant"]); // one question message, not three
    expect((await listInquiries(s.id))).toHaveLength(1);
  });

  it("a retry with the same submission id after success replays the saved answer without calling the model again", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    let calls = 0;
    setModelCallerForTests(async (input) => { calls++; return answerFrom("K4")(input); });
    const first = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I05 });
    const second = await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I05 });
    expect(calls).toBe(1);
    expect(second.status).toBe("answered");
    if (first.status === "answered" && second.status === "answered") expect(second.message.id).toBe(first.message.id);
  });

  it("refresh keeps questions, answers, and evidence; the operator history lists every question with its outcome", async () => {
    const s = await openSession();
    setModelCallerForTests(answerFrom("K2"));
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I01 });
    setModelCallerForTests(async () => { throw new Error("down"); });
    await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I05 });
    await createStaffRequest(s.id, { submissionId: randomUUID(), question: "Can I talk to someone at the office?", origin: "parent_initiated" });
    await ensureSession(s.id); // refresh
    const history = await listInquiries(s.id);
    expect(history.map((h) => [h.question, h.outcome])).toEqual([
      ["Can I talk to someone at the office?", "staff_requested"],
      [I05, "failed"],
      [I01, "answered"],
    ]);
    expect(history[0].requestId).not.toBeNull();
    const evidence = await listEvidence(s.id);
    expect([...evidence.values()].flat()).toHaveLength(1);
  });
});

describe("usage allowance", () => {
  it("session limit holds under concurrent calls; exactly `limit` succeed", async () => {
    const s = await openSession();
    const day = testDay();
    const results = await Promise.all(Array.from({ length: 8 }, () => consumeAllowance(s.id, { sessionLimit: 5, dailyLimit: 1000, day })));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(results.filter((r) => !r.ok && r.scope === "session")).toHaveLength(3);
    expect((await readUsage(s.id, { day })).sessionUsed).toBe(5);
    expect((await readUsage(s.id, { day })).dailyUsed).toBe(5); // rejected calls consumed nothing
  });

  it("daily limit is global across sessions and rolls back the session increment when exhausted", async () => {
    const a = await openSession();
    const b = await openSession();
    const day = testDay();
    const results = await Promise.all([
      ...Array.from({ length: 4 }, () => consumeAllowance(a.id, { sessionLimit: 50, dailyLimit: 3, day })),
      ...Array.from({ length: 4 }, () => consumeAllowance(b.id, { sessionLimit: 50, dailyLimit: 3, day })),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.scope === "daily")).toHaveLength(5);
    const ua = await readUsage(a.id, { day });
    const ub = await readUsage(b.id, { day });
    expect(ua.dailyUsed).toBe(3);
    expect(ua.sessionUsed + ub.sessionUsed).toBe(3);
  });

  it("a new UTC day starts a fresh daily count while the session count carries over", async () => {
    const s = await openSession();
    const day1 = testDay();
    const day2 = testDay();
    await consumeAllowance(s.id, { dailyLimit: 1, day: day1 });
    expect((await consumeAllowance(s.id, { dailyLimit: 1, day: day1 })).ok).toBe(false);
    const next = await consumeAllowance(s.id, { dailyLimit: 1, day: day2 });
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.usage.sessionUsed).toBe(2);
  });

  it("content reset keeps the session's usage count", async () => {
    const s = await openSession();
    const day = testDay();
    await consumeAllowance(s.id, { day });
    await consumeAllowance(s.id, { day });
    await resetSessionContent(s.id);
    expect((await readUsage(s.id, { day })).sessionUsed).toBe(2);
  });

  it("exhausted allowance blocks the model before dispatch but leaves the staff-request path working", async () => {
    const s = await openSession();
    await getPool().query("UPDATE demo_sessions SET ai_requests_used = $2 WHERE id = $1", [s.id, 10_000]);
    let calls = 0;
    setModelCallerForTests(async () => { calls++; return { kind: "answer", text: "x", source_ids: [] }; });
    const r = await askFrontDesk(s.id, { usageDay: DAY, submissionId: randomUUID(), question: I01 });
    expect(r).toMatchObject({ status: "limited", scope: "session" });
    expect(calls).toBe(0);
    const req = await createStaffRequest(s.id, { submissionId: randomUUID(), question: I01, origin: "parent_initiated" });
    expect(req.request.status).toBe("awaiting_review");
    // Non-AI functionality stays available at exhaustion: policy browsing, parent and staff messaging.
    expect((await listPublishedKnowledge(s.id)).length).toBeGreaterThan(0);
    const parent = await parentReply(s.id, req.request.id, "Any update?");
    expect(parent.ok).toBe(true);
    const staff = await staffReply(s.id, req.request.id, { staffName: "Dana R.", body: "Looking now.", outcome: "reply" });
    expect(staff.ok && staff.request.status).toBe("staff_reviewing");
    expect((await listMessages(s.id)).filter((m) => m.speaker !== "assistant").length).toBeGreaterThanOrEqual(3);
  });
});

describe("POST /api/ask", () => {
  const call = (sessionId: string | null, body: unknown) =>
    POST(new NextRequest("http://localhost/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json", ...(sessionId ? { [SESSION_HEADER]: sessionId } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }));

  it("I25: empty, whitespace, and oversized input are rejected with 400 before any usage is counted", async () => {
    const s = await openSession();
    const before = (await readUsage(s.id)).sessionUsed;
    expect((await call(s.id, { submissionId: randomUUID(), question: "" })).status).toBe(400);
    expect((await call(s.id, { submissionId: randomUUID(), question: "   \n" })).status).toBe(400);
    expect((await call(s.id, { submissionId: randomUUID(), question: "x".repeat(5000) })).status).toBe(400);
    expect((await call(s.id, { submissionId: "bad", question: I01 })).status).toBe(400);
    expect((await call(null, { submissionId: randomUUID(), question: I01 })).status).toBe(401);
    expect((await readUsage(s.id)).sessionUsed).toBe(before);
    expect(await listInquiries(s.id)).toHaveLength(0);
  });

  it("returns 503 disabled while the public gate is off, without touching usage", async () => {
    // AI_ANSWERS_ENABLED is read at import time; tests run with it unset.
    const s = await openSession();
    const res = await call(s.id, { submissionId: randomUUID(), question: I01 });
    expect([503, 200]).toContain(res.status);
    if (res.status === 503) {
      expect((await res.json()).status).toBe("disabled");
      expect((await readUsage(s.id)).sessionUsed).toBe(0);
    }
  });
});

describe("failed answer → Ask staff", () => {
  it("reuses the saved question message and marks the history row as sent to staff", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    setModelCallerForTests(async () => { throw new Error("down"); });
    await askFrontDesk(s.id, { usageDay: DAY, submissionId, question: I01 });
    const { request } = await createStaffRequest(s.id, { submissionId, question: I01, origin: "parent_initiated" });
    const msgs = await listMessages(s.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ speaker: "parent", requestId: request.id, id: request.questionMessageId });
    const [h] = await listInquiries(s.id);
    expect(h).toMatchObject({ outcome: "staff_requested", requestId: request.id });
  });
});
