"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { openKnowledgeDraftForRequest } from "@/lib/knowledge-loop";
import { createKnowledgeDraft, publishKnowledge, saveKnowledgeDraft, type KnowledgeWriteError } from "@/lib/knowledge";
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

export async function staffReplyAction(requestId: string, input: { staffName: string; body: string; outcome: StaffReplyOutcome; submissionId?: string }): Promise<ActionResult> {
  const session = await getActiveSession();
  if (!["reply", "needs_your_reply", "close"].includes(input.outcome)) return { ok: false, error: "Not saved." };
  return finish(await staffReply(session.id, requestId, input));
}

export async function parentReplyAction(requestId: string, body: string, submissionId?: string): Promise<ActionResult> {
  const session = await getActiveSession();
  return finish(await parentReply(session.id, requestId, body, submissionId));
}

// ---- Issue 006: operator knowledge editor. Plain forms; the page re-renders the saved state. ----
// Saving is a draft. Only "Publish" changes the policy browser and AI grounding.


const knowledgeErrorCopy: Record<KnowledgeWriteError, string> = {
  invalid_title: "Add a title, and keep it short.",
  invalid_text: "Add the policy text, and keep it under the character limit.",
  not_found: "This entry is not in your demo session.",
  nothing_to_publish: "Nothing new to publish. Save a draft first.",
};

function backToKnowledge(result: { ok: true; entry: { id: string } } | { ok: false; error: KnowledgeWriteError }, done: "saved" | "published"): never {
  revalidatePath("/", "layout");
  const q = result.ok ? `${done}=${result.entry.id}` : `error=${encodeURIComponent(knowledgeErrorCopy[result.error])}`;
  redirect(`/operator?${q}${result.ok ? `#entry-${result.entry.id}` : ""}`);
}

export async function createKnowledgeAction(formData: FormData): Promise<void> {
  const session = await getActiveSession();
  const input = { title: formData.get("title"), policyText: formData.get("policyText") };
  backToKnowledge(await createKnowledgeDraft(session.id, input as { title: string; policyText: string }), "saved");
}

export async function saveKnowledgeDraftAction(formData: FormData): Promise<void> {
  const session = await getActiveSession();
  const entryId = String(formData.get("entryId") ?? "");
  const input = { title: formData.get("title"), policyText: formData.get("policyText") };
  backToKnowledge(await saveKnowledgeDraft(session.id, entryId, input as { title: string; policyText: string }), "saved");
}

export async function publishKnowledgeAction(formData: FormData): Promise<void> {
  const session = await getActiveSession();
  const entryId = String(formData.get("entryId") ?? "");
  // One statement: the text on this form is what goes live, never a draft
  // another tab saved in between.
  const reviewed = { title: String(formData.get("title") ?? ""), policyText: String(formData.get("policyText") ?? "") };
  backToKnowledge(await publishKnowledge(session.id, entryId, reviewed), "published");
}

// ---- Issue 007: reply-to-knowledge loop. Opening a draft publishes nothing and changes no request status. ----

export type OpenDraftActionResult = { ok: true; entryId: string; href: string } | { ok: false; error: string };

export async function openKnowledgeDraftAction(requestId: string, suggestedText?: string | null): Promise<OpenDraftActionResult> {
  const session = await getActiveSession();
  const result = await openKnowledgeDraftForRequest(session.id, requestId, suggestedText);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error === "sensitive" ? "Sensitive requests do not get a knowledge draft." : result.error === "not_found" ? errorCopy.not_found : "Could not open a draft.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, entryId: result.entry.id, href: `/operator?saved=${result.entry.id}#entry-${result.entry.id}` };
}

/** Plain-form variant used on the request page when no reply text is involved. */
export async function openKnowledgeDraftFormAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("requestId") ?? "");
  const result = await openKnowledgeDraftAction(requestId, null);
  redirect(result.ok ? result.href : `/operator/inbox/${requestId}?error=${encodeURIComponent(result.error)}`);
}
