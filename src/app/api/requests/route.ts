import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HEADER } from "@/lib/center-config";
import { ensureSession, isSessionId } from "@/lib/session";
import { deriveRequestOrigin } from "@/lib/inquiries";
import { createStaffRequest, validateQuestion, validateSubmissionId } from "@/lib/requests";

export const dynamic = "force-dynamic";

// POST { submissionId, question } → 201 created | 200 already saved (retry) | 400 invalid.
// Only a 2xx with a request id means the request is saved. Origin and known
// policy come from the saved question (handoff offer, sensitive), never the client.
export async function POST(req: NextRequest) {
  const sessionId = req.headers.get(SESSION_HEADER);
  if (!isSessionId(sessionId)) return NextResponse.json({ error: "no session" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { submissionId, question, conversationId } = (body ?? {}) as { submissionId?: unknown; question?: unknown; conversationId?: unknown };
  if (!validateSubmissionId(submissionId)) return NextResponse.json({ error: "invalid submissionId" }, { status: 400 });
  if (conversationId !== undefined && !validateSubmissionId(conversationId)) return NextResponse.json({ error: "invalid conversationId" }, { status: 400 });
  const v = validateQuestion(question);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
  await ensureSession(sessionId);
  const { origin, knownPolicyEntryId } = await deriveRequestOrigin(sessionId, submissionId);
  const { request, created } = await createStaffRequest(sessionId, { conversationId: conversationId as string | undefined, submissionId, question: v.question, origin, knownPolicyEntryId });
  return NextResponse.json(
    { request: { id: request.id, status: request.status, createdAt: request.createdAt } },
    { status: created ? 201 : 200 },
  );
  } catch (error) {
    if (error instanceof Error && error.message === "conversation_changed") return NextResponse.json({ error: "This chat changed in another tab. Refresh before sending." }, { status: 409 });
    throw error;
  }
}
