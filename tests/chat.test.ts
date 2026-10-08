import { afterAll, afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { smallTalkReply } from "@/lib/small-talk";
import { setModelCallerForTests, validateModelResult } from "@/lib/answer-service";
import { askFrontDesk } from "@/lib/inquiries";
import { ensureSession, newSessionId } from "@/lib/session";
import { listMessages, listRequests } from "@/lib/requests";
import { getPool } from "@/lib/db";
import { AI_SESSION_LIMIT } from "@/lib/limits";
import { readUsage } from "@/lib/usage";
import { closePool, deleteSessions } from "./helpers";

const sessions: string[] = [];
afterEach(() => setModelCallerForTests(null));
afterAll(async () => { await deleteSessions(sessions); await closePool(); });

it("matches whole social messages, never mixed policy, sensitive, or staff requests", () => {
  for (const text of [" Hi! ", "THANK YOU.", "ok", "Good morning!"]) expect(smallTalkReply(text)).toBeTruthy();
  for (const text of ["Hi, are you closed tomorrow?", "thanks, contact staff", "ok to collect my child?", "hi my child was hurt", "yes", "no"]) {
    expect(smallTalkReply(text)).toBeNull();
  }
});

it("allows source-free chat without weakening policy answer validation", () => {
  expect(validateModelResult({ kind: "chat", text: "Hello!", source_ids: [], contact_staff: false }, [])).toMatchObject({ kind: "chat", contactStaff: false });
  expect(validateModelResult({ kind: "answer", text: "We close tomorrow.", source_ids: [], contact_staff: false }, [])).toEqual({ kind: "failure", reason: "unsupported" });
  for (const extra of [{ source_ids: ["invented"] }, { contact_staff: true }]) {
    expect(validateModelResult({ kind: "chat", text: "Hello!", source_ids: [], contact_staff: false, ...extra }, [])).toEqual({ kind: "failure", reason: "invalid_shape" });
  }
});

it("persists and replays a greeting once without model usage or a staff request", async () => {
  const id = newSessionId(); sessions.push(id); await ensureSession(id);
  const caller = vi.fn(async () => { throw new Error("Small talk must not dispatch a model"); });
  setModelCallerForTests(caller);
  const before = await readUsage(id);
  const input = { submissionId: randomUUID(), question: "Hi!" };
  const first = await askFrontDesk(id, input);
  const replay = await askFrontDesk(id, input);
  expect(first.status).toBe("chat");
  expect(replay.status).toBe("chat");
  if (first.status !== "chat" || replay.status !== "chat") return;
  expect(first.message.id).toBe(replay.message.id);
  expect(first.sources).toEqual([]);
  expect(first.request).toBeNull();
  expect(await listMessages(id)).toHaveLength(2);
  expect(await listRequests(id)).toHaveLength(0);
  expect((await readUsage(id)).sessionUsed).toBe(before.sessionUsed);
  await getPool().query("UPDATE demo_sessions SET ai_requests_used = $2 WHERE id = $1", [id, AI_SESSION_LIMIT]);
  expect((await askFrontDesk(id, { submissionId: randomUUID(), question: "thanks" })).status).toBe("chat");
  expect((await readUsage(id)).sessionUsed).toBe(AI_SESSION_LIMIT);
  expect(caller).not.toHaveBeenCalled();
});
