import type { KnowledgeEntry } from "@/lib/knowledge";
import { MAX_POLICY_TEXT_CHARS, MAX_POLICY_TITLE_CHARS } from "@/lib/limits";
import { createKnowledgeAction, publishKnowledgeAction, saveKnowledgeDraftAction } from "@/app/actions";
import { formatPublished } from "./policy-list";
import { UnsavedGuard } from "./unsaved-guard";

// Operator knowledge editor (issue 006). Plain forms on purpose: saving keeps a
// draft on the entry; only Publish changes what parents and the AI can read.

function Fields({ title, policyText }: { title: string; policyText: string }) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="eyebrow">Title</span>
        <input name="title" defaultValue={title} required maxLength={MAX_POLICY_TITLE_CHARS} className="field mt-1 py-2" />
      </label>
      <label className="block">
        <span className="eyebrow">Policy text</span>
        <textarea name="policyText" defaultValue={policyText} required maxLength={MAX_POLICY_TEXT_CHARS} rows={6} className="field mt-1" />
      </label>
    </div>
  );
}

function statusLine(e: KnowledgeEntry): string {
  if (!e.publishedAt) return "Draft. Not published: parents and the AI cannot see it yet.";
  const published = formatPublished(e.publishedAt);
  return e.draft ? `${published}. Unpublished edits saved; the published text is still the old one.` : published;
}

export function KnowledgeEditor({
  entries,
  notice,
}: {
  entries: KnowledgeEntry[];
  notice: { kind: "saved" | "published"; entryId: string } | { kind: "error"; message: string } | null;
}) {
  const published = entries.filter((e) => e.publishedAt).length;
  const drafts = entries.filter((e) => !e.publishedAt || e.draft).length;
  return (
    <section aria-labelledby="knowledge" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="knowledge" className="text-base font-semibold tracking-tight">Knowledge</h2>
        <p className="text-xs text-stone-500">
          {published} published{drafts ? ` · ${drafts} with unpublished edits` : ""}
        </p>
      </div>
      <p className="text-xs text-stone-500">Save keeps a draft. Publish is the only step that changes the policy browser and automated answers.</p>
      {notice?.kind === "error" ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{notice.message}</p>
      ) : null}

      <details className="card overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">+ New entry</summary>
        <form action={createKnowledgeAction} className="space-y-3 border-t border-stone-100 px-4 py-3">
          <Fields title="" policyText="" />
          <button type="submit" className="btn-ghost">Save draft</button>
        </form>
      </details>

      <ul className="space-y-2">
        {entries.map((e) => {
          const editing = e.draft ?? { title: e.title, policyText: e.policyText };
          const flagged = notice && notice.kind !== "error" && notice.entryId === e.id ? notice.kind : null;
          return (
            <li key={e.id} id={`entry-${e.id}`}>
              <details className="group card overflow-hidden" open={flagged !== null} data-entry={e.seedKey ?? "custom"} data-state={!e.publishedAt ? "draft" : e.draft ? "edited" : "published"}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                  <span className="min-w-0">
                    <span className="block truncate">{e.title}</span>
                    <span className="mt-0.5 block text-xs font-normal text-stone-500" data-status>{statusLine(e)}</span>
                  </span>
                  <span aria-hidden className="text-stone-400 transition group-open:rotate-90">›</span>
                </summary>
                <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 px-4 py-3">
                  {flagged ? (
                    <p role="status" className="text-xs font-medium text-emerald-700">
                      {flagged === "published" ? "Published. Parents and new answers now use this text." : "Draft saved. Not published yet."}
                    </p>
                  ) : null}
                  {e.publishedAt && e.draft ? (
                    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
                      <p className="eyebrow">Currently published</p>
                      <p className="mt-1 whitespace-pre-wrap">{e.policyText}</p>
                    </div>
                  ) : null}
                  <form action={saveKnowledgeDraftAction} id={`form-${e.id}`} className="space-y-3">
                    <input type="hidden" name="entryId" value={e.id} />
                    <Fields title={editing.title} policyText={editing.policyText} />
                    <p className="text-xs text-stone-600" data-publish-reminder>
                      Before publishing: this text becomes a center policy that every family and the AI can read. Remove anything about one child, one family, or one day&apos;s situation.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="btn-ghost">Save draft</button>
                      <button type="submit" formAction={publishKnowledgeAction} className="btn-primary">
                        {e.publishedAt ? "Publish changes" : "Publish"}
                      </button>
                    </div>
                    <UnsavedGuard formId={`form-${e.id}`} />
                  </form>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
