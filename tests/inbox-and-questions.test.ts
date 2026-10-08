import { describe, expect, it } from "vitest";
import { applyFilter, parseFilter, queueCounts } from "@/components/inbox-list";
import { inquiryByQuestion, outcomeCounts } from "@/lib/questions-thread";
import type { Inquiry } from "@/lib/inquiries";
import type { StaffRequest } from "@/lib/requests";

// Issue 016: the inbox is the queue; Questions is the conversation. Pure rules only; pages supply the rows.

const req = (id: string, status: StaffRequest["status"]): StaffRequest => ({
  id, sessionId: "s", conversationId: "c", questionMessageId: `m-${id}`, submissionId: `sub-${id}`, question: `q ${id}`, origin: "parent_initiated",
  status, knownPolicyEntryId: null, knowledgeDraftEntryId: null, createdAt: new Date(), reviewedAt: null, closedAt: null, updatedAt: new Date(),
});
const inq = (id: string, outcome: Inquiry["outcome"], questionMessageId: string | null, requestId: string | null = null): Inquiry => ({
  id, sessionId: "s", submissionId: `sub-${id}`, questionMessageId, answerMessageId: null, requestId, question: `q ${id}`, outcome, failureReason: null,
  createdAt: new Date(), updatedAt: new Date(),
});

describe("inbox filters", () => {
  const rows = [req("a", "awaiting_review"), req("b", "staff_reviewing"), req("c", "needs_your_reply"), req("d", "closed")];
  it("Open is everything not closed, Needs action is awaiting review, Closed is the rest", () => {
    expect(applyFilter(rows, "open").map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(applyFilter(rows, "action").map((r) => r.id)).toEqual(["a"]);
    expect(applyFilter(rows, "closed").map((r) => r.id)).toEqual(["d"]);
  });
  it("defaults to Open; the retired `all` and anything unknown fall back to it", () => {
    expect(parseFilter(undefined)).toBe("open");
    expect(parseFilter("all")).toBe("open");
    expect(parseFilter("nonsense")).toBe("open");
    expect(parseFilter("closed")).toBe("closed");
    expect(parseFilter("action")).toBe("action");
  });
  it("counts the queue for the chips and the empty column", () => {
    expect(queueCounts(rows)).toEqual({ open: 3, action: 1, closed: 1 });
    expect(queueCounts([])).toEqual({ open: 0, action: 0, closed: 0 });
  });
});

describe("questions thread", () => {
  it("pairs each parent question with its inquiry and skips inquiries with no saved question message", () => {
    const rows = [inq("1", "answered", "m1"), inq("2", "staff_requested", "m2", "r2"), inq("3", "failed", null)];
    const by = inquiryByQuestion(rows);
    expect(by.get("m1")?.outcome).toBe("answered");
    expect(by.get("m2")?.requestId).toBe("r2");
    expect(by.size).toBe(2);
  });
  it("counts outcomes with every kind present at zero", () => {
    const totals = outcomeCounts([inq("1", "answered", "m1"), inq("2", "answered", "m2"), inq("3", "sensitive", "m3")]);
    expect(totals.answered).toBe(2);
    expect(totals.sensitive).toBe(1);
    expect(totals.pending).toBe(0);
    expect(Object.keys(totals).sort()).toEqual(["answered", "clarified", "failed", "handoff_offered", "pending", "sensitive", "staff_requested"]);
  });
});
