import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RequestCard } from "@/components/request-card";
import { MessageBubble } from "@/components/message-bubble";
import { shouldSendOnEnter } from "@/lib/compose-keys";
import type { StaffRequest, Message } from "@/lib/requests";

// Issue 011: copy follows state, the recipient is named, Enter is IME- and touch-safe.

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const now = new Date();
const base: StaffRequest = {
  id: "r1", sessionId: "s1", conversationId: "c1", questionMessageId: null, submissionId: "sub", question: "Are you open on Veterans Day?",
  origin: "handoff_offered", status: "awaiting_review", knownPolicyEntryId: null, knowledgeDraftEntryId: null,
  createdAt: now, reviewedAt: null, closedAt: null, updatedAt: now,
};
const card = (over: Partial<StaffRequest>) => strip(renderToStaticMarkup(createElement(RequestCard, { request: { ...base, ...over }, knownPolicy: null })));

describe("request card copy follows state", () => {
  it("says 'Still needs staff' only while open; closed and needs-your-reply use their own labels", () => {
    expect(card({})).toContain("Still needs staff");
    expect(card({ status: "staff_reviewing" })).toContain("Still needs staff");
    const closed = card({ status: "closed", closedAt: now });
    expect(closed).not.toContain("Still needs staff");
    expect(closed).toContain("What you asked");
    const needs = card({ status: "needs_your_reply" });
    expect(needs).not.toContain("Still needs staff");
    expect(needs).toContain("Your request");
  });

  it("with no linked policy it says 'No policy attached', not that no policy covers the question", () => {
    const text = card({});
    expect(text).toContain("No policy attached");
    expect(text).not.toMatch(/no published policy covers/i);
    expect(card({ origin: "sensitive" })).toContain("Not answered from policy");
  });
});

describe("recipient naming", () => {
  it("labels automated messages as the AI assistant, never as a person", () => {
    const m: Message = { id: "m1", conversationId: "c1", requestId: null, speaker: "assistant", staffName: null, body: "Closed on Labor Day.", createdAt: now };
    const text = strip(renderToStaticMarkup(createElement(MessageBubble, { message: m, viewer: "parent" })));
    expect(text).toContain("AI assistant");
    expect(text).toContain("Automated");
    expect(text).not.toMatch(/front desk/i);
  });
});

describe("Enter-to-send rules", () => {
  const k = (over: Partial<Parameters<typeof shouldSendOnEnter>[0]>) => shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: false, finePointer: true, ...over });
  it("sends on plain Enter with a fine pointer only", () => {
    expect(k({})).toBe(true);
    expect(k({ shiftKey: true })).toBe(false); // newline
    expect(k({ isComposing: true })).toBe(false); // IME confirming a candidate
    expect(k({ finePointer: false })).toBe(false); // touch: the button sends
    expect(k({ key: "a" })).toBe(false);
  });
});
