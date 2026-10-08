import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureSession, newSessionId } from "@/lib/session";
import {
  createStaffRequest, getRequest, listMessages, listRequestMessages, markReviewing, parentReply, reopenRequest, staffReply,
  STAFF_NAMES, type TransitionResult,
} from "@/lib/requests";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { closePool, deleteSessions } from "./helpers";

const created: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
const I03 = "Are you open on Veterans Day?";
const DANA = "Dana R.";
const PRIYA = "Priya S.";

async function newRequest() {
  const s = await openSession();
  const { request } = await createStaffRequest(s.id, { submissionId: randomUUID(), question: I03, origin: "parent_initiated" });
  return { s, request };
}
function ok(r: TransitionResult) {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
  return r;
}

afterAll(async () => {
  await deleteSessions(created);
  await closePool();
});

describe("request progress", () => {
  it("staff names are exactly the two fictional names from the fixture", () => {
    expect([...STAFF_NAMES]).toEqual([DANA, PRIYA]);
  });

  it("opening never marks review; Mark reviewing is explicit and records reviewed_at once", async () => {
    const { s, request } = await newRequest();
    expect((await getRequest(s.id, request.id))?.status).toBe("awaiting_review");
    expect((await getRequest(s.id, request.id))?.reviewedAt).toBeNull();
    const r1 = ok(await markReviewing(s.id, request.id));
    expect(r1.request.status).toBe("staff_reviewing");
    expect(r1.request.reviewedAt).not.toBeNull();
    const r2 = ok(await markReviewing(s.id, request.id));
    expect(r2.request.reviewedAt?.getTime()).toBe(r1.request.reviewedAt?.getTime());
  });

  it("reply-only saves a named staff message and does not close; awaiting_review becomes staff_reviewing, others stay", async () => {
    const { s, request } = await newRequest();
    const r = ok(await staffReply(s.id, request.id, { staffName: DANA, body: "Checking the calendar for you.", outcome: "reply" }));
    expect(r.request.status).toBe("staff_reviewing");
    expect(r.message).toMatchObject({ speaker: "staff", staffName: DANA, requestId: request.id, body: "Checking the calendar for you." });
    const again = ok(await staffReply(s.id, request.id, { staffName: PRIYA, body: "Still checking.", outcome: "reply" }));
    expect(again.request.status).toBe("staff_reviewing");
    expect(again.request.closedAt).toBeNull();
    const thread = await listRequestMessages(s.id, request.id);
    expect(thread.map((m) => [m.speaker, m.staffName])).toEqual([["parent", null], ["staff", DANA], ["staff", PRIYA]]);
    expect(thread[1].createdAt).toBeInstanceOf(Date);
  });

  it("follow-up marks Needs your reply; the parent's answer sends it back to awaiting review", async () => {
    const { s, request } = await newRequest();
    const f = ok(await staffReply(s.id, request.id, { staffName: DANA, body: "Which classroom is your child in?", outcome: "needs_your_reply" }));
    expect(f.request.status).toBe("needs_your_reply");
    const p = ok(await parentReply(s.id, request.id, "The toddler room."));
    expect(p.request.status).toBe("awaiting_review");
    expect(p.message).toMatchObject({ speaker: "parent", staffName: null, requestId: request.id });
  });

  it("Send & close persists the reply and closes; reopen undoes without a second step", async () => {
    const { s, request } = await newRequest();
    const c = ok(await staffReply(s.id, request.id, { staffName: PRIYA, body: "We are open on Veterans Day.", outcome: "close" }));
    expect(c.request.status).toBe("closed");
    expect(c.request.closedAt).not.toBeNull();
    expect((await listRequestMessages(s.id, request.id)).at(-1)?.body).toBe("We are open on Veterans Day.");
    const r = ok(await reopenRequest(s.id, request.id));
    expect(r.request.status).toBe("staff_reviewing");
    expect(r.request.closedAt).toBeNull();
    // reply-only on a closed request keeps it closed; closing twice is harmless
    ok(await staffReply(s.id, request.id, { staffName: PRIYA, body: "Closing again.", outcome: "close" }));
    const stay = ok(await staffReply(s.id, request.id, { staffName: DANA, body: "One more note.", outcome: "reply" }));
    expect(stay.request.status).toBe("closed");
  });

  it("a parent reply to a closed request reopens it as awaiting review; while staff are reviewing it stays", async () => {
    const { s, request } = await newRequest();
    ok(await staffReply(s.id, request.id, { staffName: DANA, body: "Done.", outcome: "close" }));
    const p = ok(await parentReply(s.id, request.id, "Actually, one more thing."));
    expect(p.request.status).toBe("awaiting_review");
    expect(p.request.closedAt).toBeNull();
    ok(await markReviewing(s.id, request.id));
    const p2 = ok(await parentReply(s.id, request.id, "And another."));
    expect(p2.request.status).toBe("staff_reviewing");
  });

  it("closing or replying publishes nothing: knowledge entries are untouched", async () => {
    const { s, request } = await newRequest();
    const before = await listPublishedKnowledge(s.id);
    ok(await staffReply(s.id, request.id, { staffName: DANA, body: "Open on Veterans Day.", outcome: "close" }));
    expect(await listPublishedKnowledge(s.id)).toEqual(before);
    expect(before.some((k) => k.policyText.includes("Veterans Day"))).toBe(false);
  });

  it("refresh keeps the whole exchange and progress in the parent conversation", async () => {
    const { s, request } = await newRequest();
    ok(await staffReply(s.id, request.id, { staffName: DANA, body: "Reply one.", outcome: "reply" }));
    ok(await parentReply(s.id, request.id, "Detail."));
    ok(await staffReply(s.id, request.id, { staffName: PRIYA, body: "Reply two.", outcome: "close" }));
    await ensureSession(s.id); // refresh
    const msgs = await listMessages(s.id);
    expect(msgs.map((m) => m.body)).toEqual([I03, "Reply one.", "Detail.", "Reply two."]);
    expect(msgs.every((m) => m.requestId === request.id)).toBe(true);
    expect((await getRequest(s.id, request.id))?.status).toBe("closed");
  });

  it("rejects empty bodies and unknown staff names without saving", async () => {
    const { s, request } = await newRequest();
    expect(await staffReply(s.id, request.id, { staffName: DANA, body: "   ", outcome: "reply" })).toEqual({ ok: false, error: "invalid_body" });
    expect(await staffReply(s.id, request.id, { staffName: "Someone", body: "hi", outcome: "reply" })).toEqual({ ok: false, error: "invalid_staff_name" });
    expect(await parentReply(s.id, request.id, "")).toEqual({ ok: false, error: "invalid_body" });
    expect(await listRequestMessages(s.id, request.id)).toHaveLength(1);
    expect((await getRequest(s.id, request.id))?.status).toBe("awaiting_review");
  });

  it("ids from another session are rejected by every action and change nothing", async () => {
    const { s, request } = await newRequest();
    const other = await openSession();
    const notFound = { ok: false, error: "not_found" };
    expect(await markReviewing(other.id, request.id)).toEqual(notFound);
    expect(await reopenRequest(other.id, request.id)).toEqual(notFound);
    expect(await staffReply(other.id, request.id, { staffName: DANA, body: "hi", outcome: "close" })).toEqual(notFound);
    expect(await parentReply(other.id, request.id, "hi")).toEqual(notFound);
    expect(await listRequestMessages(other.id, request.id)).toEqual([]);
    expect(await markReviewing(other.id, "not-a-uuid")).toEqual(notFound);
    expect((await getRequest(s.id, request.id))?.status).toBe("awaiting_review");
    expect(await listRequestMessages(s.id, request.id)).toHaveLength(1);
    expect(await listMessages(other.id)).toHaveLength(0);
  });
});
