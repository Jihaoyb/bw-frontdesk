import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { ensureSession, newSessionId, resetSessionContent } from "@/lib/session";
import { createStaffRequest, getRequest, listMessages, listRequests, validateQuestion } from "@/lib/requests";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { SESSION_HEADER } from "@/lib/center-config";
import { POST } from "@/app/api/requests/route";
import { closePool, deleteSessions } from "./helpers";

const created: string[] = [];
async function openSession() {
  const id = newSessionId();
  created.push(id);
  return ensureSession(id);
}
const I03 = "Are you open on Veterans Day?";

afterAll(async () => {
  await deleteSessions(created);
  await closePool();
});

describe("staff requests", () => {
  it("Ask staff saves the question as a parent message and one awaiting-review request in the inbox", async () => {
    const s = await openSession();
    const { request, created: isNew } = await createStaffRequest(s.id, { submissionId: randomUUID(), question: I03, origin: "parent_initiated" });
    expect(isNew).toBe(true);
    expect(request.status).toBe("awaiting_review");
    expect(request.origin).toBe("parent_initiated");
    expect(request.knownPolicyEntryId).toBeNull(); // nothing invented
    const msgs = await listMessages(s.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ speaker: "parent", body: I03, id: request.questionMessageId });
    const inbox = await listRequests(s.id);
    expect(inbox.map((r) => r.id)).toEqual([request.id]);
    // opening does not change status
    expect((await getRequest(s.id, request.id))?.status).toBe("awaiting_review");
  });

  it("rejects empty, whitespace-only, and oversized questions before saving anything", async () => {
    expect(validateQuestion("")).toMatchObject({ ok: false });
    expect(validateQuestion("   \n ")).toMatchObject({ ok: false });
    expect(validateQuestion("x".repeat(MAX_QUESTION_CHARS + 1))).toMatchObject({ ok: false });
    expect(validateQuestion("  hi ")).toEqual({ ok: true, question: "hi" });
    const s = await openSession();
    await expect(createStaffRequest(s.id, { submissionId: randomUUID(), question: "   ", origin: "parent_initiated" })).rejects.toThrow(/invalid question/);
    await expect(createStaffRequest(s.id, { submissionId: "nope", question: I03, origin: "parent_initiated" })).rejects.toThrow(/invalid submission id/);
    expect(await listRequests(s.id)).toHaveLength(0);
    expect(await listMessages(s.id)).toHaveLength(0);
  });

  it("retrying with the same submission id creates one request and one message, even when concurrent", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createStaffRequest(s.id, { submissionId, question: I03, origin: "parent_initiated" })),
    );
    const ids = new Set(results.map((r) => r.request.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    const again = await createStaffRequest(s.id, { submissionId, question: I03, origin: "parent_initiated" });
    expect(again.created).toBe(false);
    expect(again.request.id).toBe(results[0].request.id);
    expect(await listRequests(s.id)).toHaveLength(1);
    expect(await listMessages(s.id)).toHaveLength(1);
  });

  it("the same submission id in another session is a different request; cross-session reads return nothing", async () => {
    const a = await openSession();
    const b = await openSession();
    const submissionId = randomUUID();
    const ra = await createStaffRequest(a.id, { submissionId, question: I03, origin: "parent_initiated" });
    const rb = await createStaffRequest(b.id, { submissionId, question: "What time is lunch?", origin: "parent_initiated" });
    expect(ra.request.id).not.toBe(rb.request.id);
    expect(await getRequest(b.id, ra.request.id)).toBeNull();
    expect((await listRequests(b.id)).map((r) => r.id)).toEqual([rb.request.id]);
    expect((await listMessages(b.id)).map((m) => m.body)).toEqual(["What time is lunch?"]);
  });

  it("requests survive re-opening the session and are removed by reset", async () => {
    const s = await openSession();
    await createStaffRequest(s.id, { submissionId: randomUUID(), question: I03, origin: "parent_initiated" });
    await ensureSession(s.id); // refresh
    expect(await listRequests(s.id)).toHaveLength(1);
    await resetSessionContent(s.id);
    expect(await listRequests(s.id)).toHaveLength(0);
    expect(await listMessages(s.id)).toHaveLength(0);
  });

  it("origin tag is stored for handoff-offered and sensitive requests", async () => {
    const s = await openSession();
    const h = await createStaffRequest(s.id, { submissionId: randomUUID(), question: I03, origin: "handoff_offered" });
    const sens = await createStaffRequest(s.id, { submissionId: randomUUID(), question: "Another kid bit my daughter today and nobody told me. What happened?", origin: "sensitive" });
    expect(h.request.origin).toBe("handoff_offered");
    expect(sens.request.origin).toBe("sensitive");
  });
});

describe("POST /api/requests", () => {
  const call = (sessionId: string | null, body: unknown) =>
    POST(new NextRequest("http://localhost/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json", ...(sessionId ? { [SESSION_HEADER]: sessionId } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }));

  it("201 on first save, 200 on retry with the same id, 400 for bad input, 401 without a session", async () => {
    const s = await openSession();
    const submissionId = randomUUID();
    const first = await call(s.id, { submissionId, question: I03 });
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.request.status).toBe("awaiting_review");

    const retry = await call(s.id, { submissionId, question: I03 });
    expect(retry.status).toBe(200);
    expect((await retry.json()).request.id).toBe(firstBody.request.id);

    expect((await call(s.id, { submissionId: randomUUID(), question: "  " })).status).toBe(400);
    expect((await call(s.id, { submissionId: "x", question: I03 })).status).toBe(400);
    expect((await call(s.id, "{not json")).status).toBe(400);
    expect((await call(null, { submissionId: randomUUID(), question: I03 })).status).toBe(401);
    expect(await listRequests(s.id)).toHaveLength(1);
  });
});
