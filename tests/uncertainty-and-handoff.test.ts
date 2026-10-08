import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId } from "@/lib/session";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { setModelCallerForTests, validateModelResult, type ContextTurn, type ModelCaller } from "@/lib/answer-service";
import { askFrontDesk, deriveRequestOrigin, listEvidence, listInquiries } from "@/lib/inquiries";
import { createStaffRequest, listMessages, listRequests } from "@/lib/requests";
import { getPool } from "@/lib/db";
import { closePool, deleteSessions } from "./helpers";

const created: string[] = [];
const testDays: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
let dayCounter = 0;
function testDay() {
  const base = Date.UTC(1900 + Math.floor(Math.random() * 80), 0, 1);
  const d = new Date(base + (dayCounter++) * 86400000).toISOString().slice(0, 10);
  testDays.push(d);
  return d;
}
const DAY = testDay();

// Inquiry text verbatim from docs/test-inquiries.md.
const I03 = "Are you open on Veterans Day?";
const I06 = "I forgot to pack lunch. Can you provide lunch today and what is it?";
const I07 = "Can I talk to someone at the office?";
const I08 = "What's the policy?";
const I13 = "we're running late, can grandma pick up leo today? she's not on the list";
const I23 = "Are you open December 23?";
const I29 = "Another kid bit my daughter today and nobody told me. What happened?";
const I30 = "my ex is not allowed to pick up our son anymore, please make sure of that";

const seedTitle: Record<string, string> = { K2: "Holiday closures 2026–2027", K4: "Meals and snacks", K5: "Spare lunches", K7: "Drop-off, pickup, and authorized adults" };
function idOf(system: string, seedKey: string) {
  return system.match(new RegExp(`\\[([0-9a-f-]{36})\\] ${seedTitle[seedKey]}`))?.[1];
}
/** Controlled model returning a fixed kind with sources resolved from the prompt. */
function reply(kind: string, text: string, seedKeys: string[] = [], contact_staff = false): ModelCaller {
  return async ({ system }) => ({ kind, text, source_ids: seedKeys.map((k) => idOf(system, k)).filter(Boolean), contact_staff });
}
const ask = (sessionId: string, question: string, submissionId: string = randomUUID()) => askFrontDesk(sessionId, { usageDay: DAY, submissionId, question });
const requestCount = async (sessionId: string) =>
  (await getPool().query("SELECT count(*)::int AS n FROM staff_requests WHERE session_id = $1", [sessionId])).rows[0].n as number;

afterEach(() => setModelCallerForTests(null));
afterAll(async () => {
  await deleteSessions(created);
  if (testDays.length) await getPool().query("DELETE FROM usage_daily WHERE day = ANY($1::date[])", [testDays]);
  await closePool();
});

describe("clarification", () => {
  it("I08: a targeted clarification is saved with no sources, and the exchange grounds the next answer", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("clarify", "Which policy do you mean: hours, closures, illness, meals, or billing?"));
    const first = await ask(s.id, I08);
    expect(first.status).toBe("clarified");
    if (first.status !== "clarified") return;
    expect(first.sources).toEqual([]);
    expect(await requestCount(s.id)).toBe(0);

    let seenTurns: ContextTurn[] = [];
    setModelCallerForTests(async ({ system, turns }) => {
      seenTurns = turns;
      return { kind: "answer", text: "Closed Thanksgiving Day and the day after.", source_ids: [idOf(system, "K2")], contact_staff: false };
    });
    const second = await ask(s.id, "closures");
    expect(second.status).toBe("answered");
    expect(seenTurns.map((t) => t.speaker)).toEqual(["parent", "assistant"]);
    expect(seenTurns[0].body).toBe(I08);
    expect(seenTurns[1].body).toContain("Which policy");
    expect((await listInquiries(s.id)).map((i) => i.outcome).sort()).toEqual(["answered", "clarified"]);
  });
});

describe("missing knowledge and handoff", () => {
  it("I03: a knowledge gap offers Ask staff without creating a request; choosing it files one request with the cited policy", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("handoff", "Published closures do not mention Veterans Day, so I cannot say. Staff can help.", ["K2"]));
    const submissionId = randomUUID();
    const r = await ask(s.id, I03, submissionId);
    expect(r.status).toBe("handoff_offered");
    if (r.status !== "handoff_offered") return;
    expect(r.sources.map((e) => e.title)).toEqual([seedTitle.K2]);
    expect(r.request).toBeNull();
    expect(await requestCount(s.id)).toBe(0);

    const derived = await deriveRequestOrigin(s.id, submissionId);
    const k2 = (await listPublishedKnowledge(s.id)).find((k) => k.seedKey === "K2")!;
    expect(derived).toEqual({ origin: "handoff_offered", knownPolicyEntryId: k2.id });
    const first = await createStaffRequest(s.id, { submissionId, question: I03, ...derived });
    const again = await createStaffRequest(s.id, { submissionId, question: I03, ...derived });
    expect(first.created).toBe(true);
    expect(again).toMatchObject({ created: false, request: { id: first.request.id } });
    expect(first.request).toMatchObject({ origin: "handoff_offered", knownPolicyEntryId: k2.id, status: "awaiting_review" });
    expect(await requestCount(s.id)).toBe(1);
    // The question was saved once; the request attaches to that message.
    const msgs = await listMessages(s.id);
    expect(msgs.filter((m) => m.speaker === "parent")).toHaveLength(1);
    expect(msgs[0].requestId).toBe(first.request.id);
    // History keeps the handoff outcome and gains the request link.
    const [inq] = await listInquiries(s.id);
    expect(inq).toMatchObject({ outcome: "handoff_offered", requestId: first.request.id });
  });

  it("I07: explicit staff intent creates the request in the same flow, with no second confirmation and no front-desk message", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("handoff", "Sure, staff can help.", [], true));
    const r = await ask(s.id, I07);
    expect(r.status).toBe("staff_requested");
    if (r.status !== "staff_requested") return;
    expect(r.request).toMatchObject({ origin: "parent_initiated", status: "awaiting_review", question: I07 });
    expect(await requestCount(s.id)).toBe(1);
    const msgs = await listMessages(s.id);
    expect(msgs.map((m) => m.speaker)).toEqual(["parent"]);
    expect(msgs[0].requestId).toBe(r.request.id);
    expect((await listInquiries(s.id))[0]).toMatchObject({ outcome: "staff_requested", requestId: r.request.id });
    // A retry after a lost response replays the same request.
    const replayed = await ask(s.id, I07, r.inquiry.submissionId);
    expect(replayed.status).toBe("staff_requested");
    expect(await requestCount(s.id)).toBe(1);
  });

  it("I23: conflicting entries are both exposed as evidence on a handoff; an answer citing only one is still a handoff, never a request", async () => {
    const s = await openSession();
    await getPool().query(
      `INSERT INTO knowledge_entries (session_id, seed_key, title, policy_text, published_at, sort_order) VALUES ($1, 'K2b', 'Winter Break', 'Winter Break runs December 23 through January 2', now(), 99)`,
      [s.id]);
    setModelCallerForTests(async ({ system }) => ({
      kind: "handoff",
      text: "Two published entries disagree about December 23: one closes for Winter Break from December 24, the other from December 23. Staff can confirm which applies.",
      source_ids: [idOf(system, "K2"), system.match(/\[([0-9a-f-]{36})\] Winter Break/)?.[1]],
      contact_staff: false,
    }));
    const r = await ask(s.id, I23);
    expect(r.status).toBe("handoff_offered");
    if (r.status !== "handoff_offered") return;
    expect(r.sources.map((e) => e.title).sort()).toEqual([seedTitle.K2, "Winter Break"]);
    const evidence = await listEvidence(s.id);
    expect(evidence.get(r.message.id)).toHaveLength(2);
    expect(await requestCount(s.id)).toBe(0);
  });
});

describe("service confirmation", () => {
  it("I06 and I13: known policy is cited, the decision stays with staff, and nothing is reserved or approved", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("handoff", "The center can provide a lunch for a fee when one is forgotten. Today's menu is not in published knowledge. Staff confirm whether a lunch is available today.", ["K5", "K4"]));
    const lunch = await ask(s.id, I06);
    expect(lunch.status).toBe("handoff_offered");
    if (lunch.status !== "handoff_offered") return;
    expect(lunch.sources.map((e) => e.title)).toEqual([seedTitle.K5, seedTitle.K4]);

    setModelCallerForTests(reply("handoff", "Pickup by someone not on the authorized list needs written notice. Staff decide whether that can happen today.", ["K7"]));
    const pickup = await ask(s.id, I13);
    expect(pickup.status).toBe("handoff_offered");
    if (pickup.status !== "handoff_offered") return;
    expect(pickup.sources.map((e) => e.title)).toEqual([seedTitle.K7]);

    expect(await requestCount(s.id)).toBe(0);
    const derived = await deriveRequestOrigin(s.id, lunch.inquiry.submissionId);
    expect(derived.origin).toBe("handoff_offered");
    const { request } = await createStaffRequest(s.id, { submissionId: lunch.inquiry.submissionId, question: I06, ...derived });
    expect(request.status).toBe("awaiting_review"); // saved, not reviewed, not approved
  });
});

describe("sensitive inquiries", () => {
  it("I29: no policy answer even if the model attaches sources; Ask staff files a sensitive request", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("sensitive", "I'm sorry to hear that. Staff will handle this directly with you.", ["K7"]));
    const submissionId = randomUUID();
    const r = await ask(s.id, I29, submissionId);
    expect(r.status).toBe("sensitive");
    if (r.status !== "sensitive") return;
    expect(r.sources).toEqual([]);
    expect(r.request).toBeNull();
    expect((await listEvidence(s.id)).size).toBe(0);
    expect(await requestCount(s.id)).toBe(0);
    const derived = await deriveRequestOrigin(s.id, submissionId);
    expect(derived).toEqual({ origin: "sensitive", knownPolicyEntryId: null });
    const { request } = await createStaffRequest(s.id, { submissionId, question: I29, ...derived });
    expect(request.origin).toBe("sensitive");
    expect((await listInquiries(s.id))[0]).toMatchObject({ outcome: "sensitive", requestId: request.id });
  });

  it("I30: sensitive plus explicit staff intent hands off immediately, flagged sensitive, no policy shown", async () => {
    const s = await openSession();
    setModelCallerForTests(reply("sensitive", "Understood. Staff will handle this with you directly.", ["K7"], true));
    const r = await ask(s.id, I30);
    expect(r.status).toBe("sensitive");
    if (r.status !== "sensitive") return;
    expect(r.request).toMatchObject({ origin: "sensitive", status: "awaiting_review", knownPolicyEntryId: null });
    expect(r.sources).toEqual([]);
    expect(await requestCount(s.id)).toBe(1);
    expect((await listRequests(s.id))[0].origin).toBe("sensitive");
    expect((await listInquiries(s.id))[0]).toMatchObject({ outcome: "sensitive", requestId: r.request!.id });
  });
});

describe("technical failure", () => {
  it("timeout, invalid shape, and unknown source ids keep the question, show nothing, and leave Retry and Ask staff open", async () => {
    const s = await openSession();
    const knowledge = await listPublishedKnowledge(s.id);
    expect(validateModelResult({ kind: "sensitive", text: "x", source_ids: [randomUUID()] }, knowledge)).toMatchObject({ kind: "sensitive" });
    expect(validateModelResult({ kind: "handoff", text: "x", source_ids: [randomUUID()] }, knowledge)).toEqual({ kind: "failure", reason: "unknown_source" });
    expect(validateModelResult({ kind: "nope", text: "x", source_ids: [] }, knowledge)).toEqual({ kind: "failure", reason: "invalid_shape" });

    const submissionId = randomUUID();
    setModelCallerForTests(({ signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const { MODEL_TIMEOUT_MS } = await import("@/lib/limits");
    const slow = ask(s.id, I03, submissionId);
    const timedOut = await Promise.race([slow, new Promise((r) => setTimeout(() => r("still waiting"), MODEL_TIMEOUT_MS + 2000))]);
    expect(timedOut).toMatchObject({ status: "failed", reason: "timeout" });
    expect((await listMessages(s.id)).map((m) => m.speaker)).toEqual(["parent"]);

    setModelCallerForTests(async () => ({ kind: "answer", text: "Guess", source_ids: [randomUUID()], contact_staff: false }));
    expect(await ask(s.id, I03, submissionId)).toMatchObject({ status: "failed", reason: "unknown_source" });
    expect((await listMessages(s.id)).filter((m) => m.speaker === "parent")).toHaveLength(1);

    // Ask staff after a failure: one request, question message reused, history updated.
    const derived = await deriveRequestOrigin(s.id, submissionId);
    expect(derived.origin).toBe("parent_initiated");
    const { request } = await createStaffRequest(s.id, { submissionId, question: I03, ...derived });
    expect((await listInquiries(s.id))[0]).toMatchObject({ outcome: "staff_requested", requestId: request.id });
    expect((await listMessages(s.id)).filter((m) => m.speaker === "parent")).toHaveLength(1);
  });
}, 40000);
