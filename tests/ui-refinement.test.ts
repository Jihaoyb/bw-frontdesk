import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ensureSession, newSessionId } from '@/lib/session';
import { startNewConversation } from '@/lib/conversations';
import { createStaffRequest, getOrCreateConversation, listMessages, listRequests, STAFF_NAMES, staffReply } from '@/lib/requests';
import { askFrontDesk, listInquiries } from '@/lib/inquiries';
import { setModelCallerForTests } from '@/lib/answer-service';
import { listAllKnowledge, listPublishedKnowledge, saveKnowledgeDraft, publishKnowledge } from '@/lib/knowledge';
import { answerRate, inboxItems } from '@/lib/inbox';
import { readUsage } from '@/lib/usage';
import { getPool } from '@/lib/db';
import { closePool, deleteSessions } from './helpers';

const sessions: string[] = [];
const day = new Date(Date.UTC(1700 + Math.floor(Math.random() * 50), 0, 1) + Math.floor(Math.random() * 300) * 86400000).toISOString().slice(0, 10);
async function session() { const id = newSessionId(); sessions.push(id); await ensureSession(id); return id; }
afterEach(() => setModelCallerForTests(null));
afterAll(async () => { await deleteSessions(sessions); await getPool().query('DELETE FROM usage_daily WHERE day = $1', [day]); await closePool(); });

describe('Issue 018', () => {
  it('uses AI outcomes only for the percentage, including zero and 5/9', () => {
    expect(answerRate([])).toEqual({ answered: 0, eligible: 0, percentage: null });
    const outcomes = ['answered','answered','answered','answered','answered','clarified','handoff_offered','sensitive','failed','chat','pending','staff_requested'] as const;
    expect(answerRate(outcomes.map((outcome) => ({ outcome })))).toEqual({ answered: 5, eligible: 9, percentage: 56 });
  });
  it('restarts once, keeps requests/replies/usage, isolates new context, and rejects stale new submissions', async () => {
    const id = await session();
    const first = await getOrCreateConversation(id);
    const original = await createStaffRequest(id, { conversationId: first, submissionId: randomUUID(), question: 'Old private lunch question', origin: 'parent_initiated' });
    const before = await readUsage(id);
    const [next, repeated] = await Promise.all([startNewConversation(id, first), startNewConversation(id, first)]);
    expect(next).toBe(repeated); expect(next).not.toBe(first);
    expect(await getOrCreateConversation(id)).toBe(next);
    await expect(askFrontDesk(id, { conversationId: first, submissionId: randomUUID(), question: 'Hi' })).rejects.toThrow('conversation_changed');
    await expect(createStaffRequest(id, { conversationId: first, submissionId: randomUUID(), question: 'stale', origin: 'parent_initiated' })).rejects.toThrow('conversation_changed');
    const reply = await staffReply(id, original.request.id, { staffName: STAFF_NAMES[0], body: 'Your previous request still works.', outcome: 'reply' });
    expect(reply.ok).toBe(true);
    expect((await listMessages(id)).every((m) => m.conversationId === first)).toBe(true);
    expect((await listRequests(id))[0].id).toBe(original.request.id);
    expect((await readUsage(id)).sessionUsed).toBe(before.sessionUsed);
    setModelCallerForTests(async ({ turns }) => {
      expect(turns).toEqual([]);
      return { kind: 'clarify', text: 'Which age group?', source_ids: [], contact_staff: false };
    });
    await askFrontDesk(id, { conversationId: next, submissionId: randomUUID(), question: 'Tell me about enrollment options', usageDay: day });
    expect((await listMessages(id)).some((m) => m.conversationId === next)).toBe(true);
    expect(await startNewConversation(id, first)).toBe(next); // lost-response retry after the new chat has messages
    const other = await session();
    await expect(askFrontDesk(other, { conversationId: next, submissionId: randomUUID(), question: 'Hi' })).rejects.toThrow('conversation_changed');
    expect(await listMessages(other)).toEqual([]);
  });
  it('blocks restart during a pending answer and attaches delayed handoffs to their original chat', async () => {
    const id = await session(); const first = await getOrCreateConversation(id);
    const submissionId = randomUUID();
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    setModelCallerForTests(async () => { entered(); await new Promise<void>((resolve) => { release = resolve; }); return { kind: 'handoff', text: 'Staff can confirm the holiday.', source_ids: [], contact_staff: false }; });
    const answer = askFrontDesk(id, { conversationId: first, submissionId, question: 'Is Veterans Day a closure?', usageDay: day });
    await started;
    try { await expect(startNewConversation(id, first)).rejects.toThrow('still being saved'); }
    finally { release(); }
    await answer;
    const next = await startNewConversation(id, first);
    const request = await createStaffRequest(id, { submissionId, question: 'Is Veterans Day a closure?', origin: 'handoff_offered' });
    expect(request.request.conversationId).toBe(first);
    expect(await getOrCreateConversation(id)).toBe(next);
    const inquiries = await listInquiries(id); const requests = await listRequests(id);
    expect(inboxItems(inquiries, requests)).toHaveLength(1);
    expect(answerRate(inquiries)).toEqual({ answered: 0, eligible: 1, percentage: 0 });
  });
  it('keeps category drafts unpublished and publishes the reviewed category atomically', async () => {
    const id = await session();
    const entry = (await listAllKnowledge(id)).find((k) => k.seedKey === 'K9')!;
    expect(entry.category).toBe('Tuition');
    await saveKnowledgeDraft(id, entry.id, { title: entry.title, policyText: entry.policyText, category: 'Policies' });
    expect((await listAllKnowledge(id)).find((k) => k.id === entry.id)?.draft?.category).toBe('Policies');
    expect((await listPublishedKnowledge(id)).find((k) => k.id === entry.id)?.category).toBe('Tuition');
    await publishKnowledge(id, entry.id, { title: entry.title, policyText: entry.policyText, category: 'Contact' });
    const published = (await listPublishedKnowledge(id)).find((k) => k.id === entry.id)!;
    expect(published.category).toBe('Contact'); expect(published.draft).toBeNull();
    expect(await saveKnowledgeDraft(id, entry.id, { title: entry.title, policyText: entry.policyText, category: 'bad' as never })).toEqual({ ok: false, error: 'invalid_category' });
  });
});
