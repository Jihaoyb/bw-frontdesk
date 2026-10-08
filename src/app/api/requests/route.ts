import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HEADER } from "@/lib/center-config";
import { ensureSession, isSessionId } from "@/lib/session";
import { createStaffRequest, validateQuestion, validateSubmissionId } from "@/lib/requests";

export const dynamic = "force-dynamic";

// POST { submissionId, question } → 201 created | 200 already saved (retry) | 400 invalid.
// Only a 2xx with a request id means the request is saved.
export async function POST(req: NextRequest) {
  const sessionId = req.headers.get(SESSION_HEADER);
  if (!isSessionId(sessionId)) return NextResponse.json({ error: "no session" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { submissionId, question } = (body ?? {}) as { submissionId?: unknown; question?: unknown };
  if (!validateSubmissionId(submissionId)) return NextResponse.json({ error: "invalid submissionId" }, { status: 400 });
  const v = validateQuestion(question);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  await ensureSession(sessionId);
  const { request, created } = await createStaffRequest(sessionId, {
    submissionId,
    question: v.question,
    origin: "parent_initiated",
  });
  return NextResponse.json(
    { request: { id: request.id, status: request.status, createdAt: request.createdAt } },
    { status: created ? 201 : 200 },
  );
}
