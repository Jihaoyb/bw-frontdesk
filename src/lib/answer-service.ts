// The one server-side interface to the model. Encapsulates the Responses API
// call, structured output, and validation of the result shape and its source
// references. Tests swap the model caller for controlled responses.
import type { KnowledgeEntry } from "./knowledge";
import { MAX_ANSWER_CHARS, MAX_ANSWER_TOKENS, MODEL_TIMEOUT_MS } from "./limits";

export type ContextTurn = { speaker: "parent" | "assistant"; body: string };

/** Raw structured result the model must produce. */
export type ModelResult = {
  kind: "answer" | "clarify" | "handoff";
  text: string;
  source_ids: string[];
};

/** A caller takes the prompt pieces and returns the parsed JSON (or throws). */
export type ModelCaller = (input: { system: string; turns: ContextTurn[]; question: string; signal: AbortSignal }) => Promise<unknown>;

export type AnswerResult =
  | { kind: "answer"; text: string; sources: KnowledgeEntry[] }
  | { kind: "clarify"; text: string }
  | { kind: "handoff"; text: string; sources: KnowledgeEntry[] }
  | { kind: "failure"; reason: "timeout" | "invalid_shape" | "unknown_source" | "unsupported" | "too_long" | "model_error" };

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["answer", "clarify", "handoff"] },
    text: { type: "string" },
    source_ids: { type: "array", items: { type: "string" } },
  },
  required: ["kind", "text", "source_ids"],
} as const;

export function buildSystemPrompt(knowledge: KnowledgeEntry[]): string {
  const entries = knowledge.map((k) => `[${k.id}] ${k.title}\n${k.policyText}`).join("\n\n");
  return [
    "You are the front desk assistant for one childcare center. Families ask about policies.",
    "Answer ONLY from the published knowledge entries below. Each entry has an id in brackets.",
    "Return kind=answer with a concise, plain answer (2 to 4 short sentences) and the ids of every entry you relied on.",
    "If the entries do not cover the question, return kind=handoff with a brief sentence saying staff can help, and include ids of any partially related entries. Never guess.",
    "If the question is ambiguous and you need one detail to answer, return kind=clarify with one targeted question and no ids.",
    "Never promise, reserve, approve, clear, or confirm anything. A policy explanation is not permission. Do not mention response times.",
    "",
    "PUBLISHED KNOWLEDGE",
    entries,
  ].join("\n");
}

/** Default caller: OpenAI Responses API with a strict JSON schema. Credentials stay here. */
export const openAiCaller: ModelCaller = async ({ system, turns, question, signal }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("model not configured");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      max_output_tokens: MAX_ANSWER_TOKENS,
      input: [
        { role: "system", content: system },
        ...turns.map((t) => ({ role: t.speaker === "parent" ? "user" : "assistant", content: t.body })),
        { role: "user", content: question },
      ],
      text: { format: { type: "json_schema", name: "front_desk_result", strict: true, schema: RESULT_SCHEMA } },
    }),
  });
  if (!res.ok) throw new Error(`model http ${res.status}`);
  const data = (await res.json()) as { output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
  const text = data.output_text
    ?? data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
  if (!text) throw new Error("model returned no text");
  return JSON.parse(text);
};

let caller: ModelCaller = openAiCaller;
/** Test seam: replace the model with controlled responses. Never used by production code paths. */
export function setModelCallerForTests(next: ModelCaller | null): void {
  caller = next ?? openAiCaller;
}

/** Validate shape and references. A valid id alone is not proof of support; the live check covers that. */
export function validateModelResult(raw: unknown, knowledge: KnowledgeEntry[]): AnswerResult {
  if (!raw || typeof raw !== "object") return { kind: "failure", reason: "invalid_shape" };
  const r = raw as Partial<ModelResult>;
  if (!["answer", "clarify", "handoff"].includes(r.kind as string)) return { kind: "failure", reason: "invalid_shape" };
  if (typeof r.text !== "string" || !r.text.trim()) return { kind: "failure", reason: "invalid_shape" };
  if (!Array.isArray(r.source_ids) || !r.source_ids.every((s) => typeof s === "string")) return { kind: "failure", reason: "invalid_shape" };
  if (r.text.length > MAX_ANSWER_CHARS) return { kind: "failure", reason: "too_long" };
  const byId = new Map(knowledge.map((k) => [k.id, k]));
  const sources: KnowledgeEntry[] = [];
  for (const id of new Set(r.source_ids)) {
    const k = byId.get(id);
    if (!k) return { kind: "failure", reason: "unknown_source" };
    sources.push(k);
  }
  const text = r.text.trim();
  if (r.kind === "answer") {
    if (sources.length === 0) return { kind: "failure", reason: "unsupported" }; // an answer with no basis is not shown
    return { kind: "answer", text, sources };
  }
  if (r.kind === "handoff") return { kind: "handoff", text, sources };
  return { kind: "clarify", text };
}

/** Ask the model and validate. Never throws; failures are a result kind so the caller can persist them. */
export async function answerQuestion(input: { question: string; knowledge: KnowledgeEntry[]; turns: ContextTurn[] }): Promise<AnswerResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MODEL_TIMEOUT_MS);
  try {
    const raw = await caller({ system: buildSystemPrompt(input.knowledge), turns: input.turns, question: input.question, signal: ctrl.signal });
    return validateModelResult(raw, input.knowledge);
  } catch (err) {
    if (ctrl.signal.aborted) return { kind: "failure", reason: "timeout" };
    if (err instanceof SyntaxError) return { kind: "failure", reason: "invalid_shape" };
    return { kind: "failure", reason: "model_error" };
  } finally {
    clearTimeout(timer);
  }
}
