"use server";

import { revalidatePath } from "next/cache";
import { getActiveSession } from "@/lib/request-session";
import { resetSessionContent } from "@/lib/session";
import { markReviewing, parentReply, reopenRequest, staffReply, type RequestStatus, type StaffReplyOutcome } from "@/lib/requests";

export async function resetDemoAction(formData: FormData): Promise<void> {
  if (formData.get("confirm") !== "yes") return; // cancellation changes nothing
  const session = await getActiveSession();
  await resetSessionContent(session.id);
  revalidatePath("/", "layout");
}

// ---- Issue 003: request progress and messages. All scoped to the active session. ----
// Each action returns a plain result so the client can show delivery feedback
// (saving / saved / unconfirmed) separately from the request's progress label.

export type ActionResult = { ok: true; status: RequestStatus } | { ok: false; error: string };

const errorCopy: Record<string, string> = {
  not_found: "This request is not in your demo session.",
  invalid_body: "Type a message first, and keep it under the character limit.",
  invalid_staff_name: "Pick a staff name.",
};

function finish(result: { ok: true; request: { status: RequestStatus } } | { ok: false; error: string }): ActionResult {
  if (!result.ok) return { ok: false, error: errorCopy[result.error] ?? "Not saved." };
  revalidatePath("/", "layout");
  return { ok: true, status: result.request.status };
}

export async function markReviewingAction(requestId: string): Promise<ActionResult> {
  const session = await getActiveSession();
  return finish(await markReviewing(session.id, requestId));
}

export async function reopenRequestAction(requestId: string): Promise<ActionResult> {
  const session = await getActiveSession();
  return finish(await reopenRequest(session.id, requestId));
}

export async function staffReplyAction(requestId: string, input: { staffName: string; body: string; outcome: StaffReplyOutcome }): Promise<ActionResult> {
  const session = await getActiveSession();
  if (!["reply", "needs_your_reply", "close"].includes(input.outcome)) return { ok: false, error: "Not saved." };
  return finish(await staffReply(session.id, requestId, input));
}

export async function parentReplyAction(requestId: string, body: string): Promise<ActionResult> {
  const session = await getActiveSession();
  return finish(await parentReply(session.id, requestId, body));
}
