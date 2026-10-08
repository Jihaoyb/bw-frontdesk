import { NavigationLink as Link } from "./navigation-link";
import { handbookCategories, type HandbookCategory } from "@/lib/handbook-categories";
import { GrowingTextarea } from "./growing-textarea";
import type { KnowledgeEntry } from "@/lib/knowledge";
import { MAX_POLICY_TEXT_CHARS, MAX_POLICY_TITLE_CHARS } from "@/lib/limits";
import { createKnowledgeAction, publishKnowledgeAction, saveKnowledgeDraftAction } from "@/app/actions";
import { formatPublished } from "./policy-list";
import { UnsavedGuard } from "./unsaved-guard";

// Operator knowledge editor (issue 006). Plain forms on purpose: saving keeps a
// draft on the entry; only Publish changes what parents and the AI can read.

function Fields({ title, policyText, category = "Other" }: { title: string; policyText: string; category?: HandbookCategory }) {
  return (
    <div className="space-y-2">
      <label className="block"><span className="eyebrow">Category</span>
        <select name="category" defaultValue={category} className="field mt-1 py-2.5">{handbookCategories.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="block">
        <span className="eyebrow">Title</span>
        <input name="title" defaultValue={title} required maxLength={MAX_POLICY_TITLE_CHARS} className="field mt-1 py-2.5" />
      </label>
      <label className="block">
        <span className="eyebrow">Policy text</span>
        <GrowingTextarea name="policyText" defaultValue={policyText} required maxLength={MAX_POLICY_TEXT_CHARS} rows={6} maxRows={16} className="field mt-1" />
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
  notice, category,
}: {
  entries: KnowledgeEntry[];
  category?: HandbookCategory;
  notice: { kind: "saved" | "published"; entryId: string } | { kind: "error"; message: string } | null;
}) {
  const visible = category ? entries.filter((e) => (e.draft?.category ?? e.category ?? "Other") === category) : entries;
  const published = entries.filter((e) => e.publishedAt).length;
  const drafts = entries.filter((e) => !e.publishedAt || e.draft).length;
  return (
    <section aria-labelledby="knowledge" className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <div className="flex flex-col gap-3 lg:sticky lg:top-36 lg:self-start">
      <div className="flex items-baseline justify-between">
        <h2 id="knowledge" className="text-[22px] font-semibold tracking-[-0.02em]">Handbook</h2>
        <p className="mono text-xs text-ink-3">
          {published} published{drafts ? ` · ${drafts} with unpublished edits` : ""}
        </p>
      </div>
      <p className="text-xs text-ink-3">Save keeps a draft. Publish is the only step that changes the policy browser and automated answers.</p>
      {notice?.kind === "error" ? (
        <p role="alert" className="rounded-2xl bg-alert-soft px-3.5 py-2 text-sm text-alert">{notice.message}</p>
      ) : null}
      <nav aria-label="Handbook categories" className="flex flex-wrap gap-2">
        {(['All', ...handbookCategories] as const).map((c) => <Link key={c} href={c === 'All' ? '/operator' : `/operator?category=${c}`} aria-current={(category ?? 'All') === c ? 'page' : undefined}
          className={`chip ${(category ?? 'All') === c ? 'chip-on' : ''}`}>
          {c} · {c === 'All' ? entries.length : entries.filter((e) => (e.draft?.category ?? e.category ?? 'Other') === c).length}
        </Link>)}
      </nav>
      <nav aria-label="Entries" className="card hidden divide-y divide-line-soft lg:block">
        {visible.map((e) => (
          <a key={e.id} href={`#entry-${e.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <span aria-hidden className={"h-2 w-2 shrink-0 rounded-full " + (!e.publishedAt ? "bg-ink-3" : e.draft ? "bg-person" : "bg-brand")} />
            <span className="truncate">{e.title}</span>
          </a>
        ))}
      </nav>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
      <details className="card overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">+ New entry</summary>
        <div className="reveal"><form action={createKnowledgeAction} id="new-handbook-entry" className="space-y-3 px-4 pb-4">
          <Fields title="" policyText="" category={category} />
          <UnsavedGuard formId="new-handbook-entry" />
          <button type="submit" className="btn-ghost">Save draft</button>
        </form></div>
      </details>

      {!visible.length && <p className="card p-4 text-sm text-ink-3">No entries in this category yet.</p>}
      <ul className="space-y-2.5">
        {visible.map((e) => {
          const editing = e.draft ?? { title: e.title, policyText: e.policyText, category: e.category };
          const flagged = notice && notice.kind !== "error" && notice.entryId === e.id ? notice.kind : null;
          return (
            <li key={e.id} id={`entry-${e.id}`}>
              <details className="card overflow-hidden" open={flagged !== null} data-entry={e.seedKey ?? "custom"} data-state={!e.publishedAt ? "draft" : e.draft ? "edited" : "published"}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className={"h-2 w-2 shrink-0 rounded-full " + (!e.publishedAt ? "bg-ink-3" : e.draft ? "bg-person" : "bg-brand")} />
                    <span className="min-w-0">
                      <span className="block">{editing.title} <span className="pill ml-2 bg-canvas text-xs text-ink-2">{editing.category ?? "Other"}</span></span>
                      <span className="mt-0.5 block text-xs font-normal text-ink-3" data-status>{statusLine(e)}</span>
                    </span>
                  </span>
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev shrink-0 text-ink-3"><path d="M6 9l6 6 6-6" /></svg>
                </summary>
                <div className="reveal"><div className="space-y-3 border-t border-line-soft px-4 py-4">
                  {flagged ? (
                    <p role="status" className="text-xs font-medium text-brand-deep">
                      {flagged === "published" ? "Published. Parents and new answers now use this text." : "Draft saved. Not published yet."}
                    </p>
                  ) : null}
                  {e.publishedAt && e.draft ? (
                    <div className="rounded-2xl bg-canvas px-3.5 py-2.5 text-xs text-ink-2 ring-1 ring-line">
                      <p className="eyebrow">Currently published</p>
                      <p className="mt-1 whitespace-pre-wrap">{e.policyText}</p>
                    </div>
                  ) : null}
                  <form action={saveKnowledgeDraftAction} id={`form-${e.id}`} className="space-y-3">
                    <input type="hidden" name="entryId" value={e.id} />
                    <Fields title={editing.title} policyText={editing.policyText} category={editing.category} />
                    <p className="text-xs text-ink-3" data-publish-reminder>
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
                </div></div>
              </details>
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
