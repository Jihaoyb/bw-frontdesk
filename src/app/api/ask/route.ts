import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HEADER } from "@/lib/center-config";
import { AI_ANSWERS_ENABLED } from "@/lib/limits";
import { askFrontDesk } from "@/lib/inquiries";
import { validateQuestion, validateSubmissionId } from "@/lib/requests";
import { ensureSession, isSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST { submissionId, question }
//  200 { status: answered|clarified|handoff_offered|sensitive, message, sources, request? }
//  200 { status: staff_requested, request }  explicit staff intent: request created, no second confirmation
//  200 { status: failed, reason }        question kept; Retry reuses submissionId
//  429 { status: limited, scope }         allowance exhausted; nothing dispatched
//  503 { status: disabled }               public model access gated off
//  400 invalid input (no usage counted)   401 no session
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
  if (!AI_ANSWERS_ENABLED) return NextResponse.json({ status: "disabled" }, { status: 503 });

  await ensureSession(sessionId);
  const result = await askFrontDesk(sessionId, { submissionId, question: v.question });
  switch (result.status) {
    case "limited":
      return NextResponse.json({ status: "limited", scope: result.scope, usage: result.usage }, { status: 429 });
    case "failed":
      return NextResponse.json({ status: "failed", reason: result.reason, inquiryId: result.inquiry.id, usage: result.usage }, { status: 200 });
    case "pending":
      return NextResponse.json({ status: "pending", inquiryId: result.inquiry.id }, { status: 202 });
    case "staff_requested":
      return NextResponse.json({ status: "staff_requested", inquiryId: result.inquiry.id, request: { id: result.request.id, status: result.request.status }, usage: result.usage });
    default:
      return NextResponse.json({
        status: result.status,
        inquiryId: result.inquiry.id,
        message: { id: result.message.id, body: result.message.body, createdAt: result.message.createdAt },
        sources: result.sources.map((s) => ({ id: s.id, title: s.title, policyText: s.policyText })),
        request: result.request ? { id: result.request.id, status: result.request.status } : null,
        usage: result.usage,
      });
  }
}
