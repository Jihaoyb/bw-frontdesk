import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId } from "@/lib/session";
import { getKnowledgeEntry, listPublishedKnowledge, publishKnowledge } from "@/lib/knowledge";
import { knowledgeGapState, openKnowledgeDraftForRequest } from "@/lib/knowledge-loop";
import { buildSystemPrompt, setModelCallerForTests, type ModelCaller } from "@/lib/answer-service";
import { askFrontDesk, listEvidence } from "@/lib/inquiries";
import { createStaffRequest, getRequest, listRequestMessages, staffReply } from "@/lib/requests";
import { getPool } from "@/lib/db";
import { closePool, deleteSessions } from "./helpers";

// Issue 007: reply → draft → explicit publication. Reply, closure, and
// publication are independent; staff replies never become grounding.

const created: string[] = [];
const testDays: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
const DAY = (() => {
  const d = new Date(Date.UTC(1700 + Math.floor(Math.random() * 40), 0, 1) + Math.floor(Math.random() * 300) * 86400000).toISOString().slice(0, 10);
  testDays.push(d);
  return d;
})();

const I03 = "Are you open on Veterans Day?";
const I15 = "Will you be open on Presidents Day?";
const DANA = "Dana R.";
const REPLY = "We're closed on Veterans Day";

/** Model stand-in: a sourced answer only when the grounding text names the holiday asked about. */
const holidayAware: ModelCaller = async ({ system, question }) => {
  const k2 = system.match(/\[([0-9a-f-]{36})\] Holiday closures/)?.[1];
  const holiday = /Veterans/i.test(question) ? "Veterans Day" : "Presidents' Day";
  if (k2 && system.includes(holiday)) return { kind: "answer", text: `The center is closed on ${holiday}.`, source_ids: [k2], contact_staff: false };
  return { kind: "handoff", text: `The published closures do not mention ${holiday}. Staff can confirm.`, source_ids: k2 ? [k2] : [], contact_staff: false };
};

async function ask(sessionId: string, question: string) {
  return askFrontDesk(sessionId, { usageDay: DAY, submissionId: randomUUID(), question });
}

afterEach(() => setModelCallerForTests(null));
afterAll(async () => {
  await deleteSessions(created);
  if (testDays.length) await getPool().query("DELETE FROM usage_daily WHERE day = ANY($1::date[])", [testDays]);
  await closePool();
});

describe("reply-to-knowledge loop", () => {
  it("missing-holiday loop: handoff → request → reply (gap stays) → draft → publish → sourced answer; history intact", async () => {
    const s = await openSession();
    setModelCallerForTests(holidayAware);

    const first = await ask(s.id, I03);
    expect(first.status).toBe("handoff_offered");
    if (first.status !== "handoff_offered") return;
    const k2 = (await listPublishedKnowledge(s.id)).find((e) => e.seedKey === "K2")!;
    expect(first.sources[0].entryId).toBe(k2.id);

    // chosen handoff: the request knows the policy it relates to
    const { request } = await createStaffRequest(s.id, { submissionId: first.inquiry.submissionId, question: I03, origin: "handoff_offered", knownPolicyEntryId: k2.id });
    expect(request.knowledgeDraftEntryId).toBeNull();
    expect(knowledgeGapState(request, null)).toBe("gap");

    // staff reply without publication: family sees it, gap stays, grounding unchanged
    const replied = await staffReply(s.id, request.id, { staffName: DANA, body: REPLY, outcome: "reply" });
    expect(replied.ok).toBe(true);
    const thread = await listRequestMessages(s.id, request.id);
    expect(thread.some((m) => m.speaker === "staff" && m.body === REPLY)).toBe(true);
    expect((await getRequest(s.id, request.id))!.status).not.toBe("closed");
    expect(buildSystemPrompt(await listPublishedKnowledge(s.id))).not.toContain(REPLY);
    const again = await ask(s.id, I03);
    expect(again.status).toBe("handoff_offered");

    // open the draft from the reply: an edit of K2 prefilled with the reply, nothing published
    const opened = await openKnowledgeDraftForRequest(s.id, request.id, REPLY);
    expect(opened.ok && opened.created).toBe(true);
    if (!opened.ok) return;
    expect(opened.entry.id).toBe(k2.id);
    expect(opened.entry.draft?.policyText).toContain(REPLY);
    expect(opened.entry.policyText).toBe(k2.policyText);
    expect(opened.entry.publishedAt?.getTime()).toBe(k2.publishedAt?.getTime());
    const linked = (await getRequest(s.id, request.id))!;
    expect(linked.knowledgeDraftEntryId).toBe(k2.id);
    expect(linked.status).toBe("staff_reviewing"); // the reply moved it; opening a draft did not close it
    expect(knowledgeGapState(linked, opened.entry)).toBe("draft");
    // opening again returns the same draft, no duplicate
    const twice = await openKnowledgeDraftForRequest(s.id, request.id, "ignored");
    expect(twice.ok && !twice.created && twice.entry.id === k2.id).toBe(true);
    expect((await ask(s.id, I03)).status).toBe("handoff_offered"); // still a draft

    // explicit publication through the issue-006 flow
    const published = await publishKnowledge(s.id, k2.id);
    expect(published.ok).toBe(true);
    expect(knowledgeGapState(linked, (await getKnowledgeEntry(s.id, k2.id))!)).toBe("published");
    const after = await ask(s.id, I03);
    expect(after.status).toBe("answered");
    if (after.status !== "answered") return;
    expect(after.sources[0].entryId).toBe(k2.id);
    expect(after.sources[0].policyText).toContain(REPLY);

    // history: the first answer still shows the text it cited; the request still exists and is still open
    const evidence = await listEvidence(s.id);
    expect(evidence.get(first.message.id)![0].policyText).toBe(k2.policyText);
    expect((await getRequest(s.id, request.id))!.status).toBe("staff_reviewing");
  });

  it("closing a request leaves the gap visible; a request with no known policy opens a new draft entry", async () => {
    const s = await openSession();
    setModelCallerForTests(holidayAware);
    const r = await ask(s.id, I15);
    if (r.status !== "handoff_offered") throw new Error(r.status);
    const { request } = await createStaffRequest(s.id, { submissionId: r.inquiry.submissionId, question: I15, origin: "handoff_offered", knownPolicyEntryId: null });
    const closed = await staffReply(s.id, request.id, { staffName: DANA, body: "Closed that day.", outcome: "close" });
    expect(closed.ok && closed.request.status).toBe("closed");
    expect(knowledgeGapState((await getRequest(s.id, request.id))!, null)).toBe("gap");
    expect((await ask(s.id, I15)).status).toBe("handoff_offered");

    const opened = await openKnowledgeDraftForRequest(s.id, request.id, "Presidents' Day (February 15, 2027): closed.");
    if (!opened.ok) throw new Error(opened.error);
    expect(opened.entry.publishedAt).toBeNull();
    expect(opened.entry.seedKey).toBeNull();
    expect(opened.entry.title).toBe(I15);
    expect((await listPublishedKnowledge(s.id)).map((e) => e.id)).not.toContain(opened.entry.id);
    expect((await getRequest(s.id, request.id))!.status).toBe("closed"); // still closed, independent
  });

  it("sensitive requests get no draft; another session cannot open a draft on this request", async () => {
    const a = await openSession();
    const b = await openSession();
    const { request } = await createStaffRequest(a.id, { submissionId: randomUUID(), question: "Another kid bit my daughter today and nobody told me. What happened?", origin: "sensitive", knownPolicyEntryId: null });
    expect(await openKnowledgeDraftForRequest(a.id, request.id, "x")).toEqual({ ok: false, error: "sensitive" });
    expect(knowledgeGapState(request, null)).toBe("none");
    expect(await openKnowledgeDraftForRequest(b.id, request.id, "x")).toEqual({ ok: false, error: "not_found" });
    expect((await getRequest(a.id, request.id))!.knowledgeDraftEntryId).toBeNull();
  });
});
