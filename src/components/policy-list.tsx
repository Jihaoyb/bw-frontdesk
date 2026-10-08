import type { KnowledgeEntry } from "@/lib/knowledge";
import { centerConfig } from "@/lib/center-config";

export function formatPublished(d: Date | null): string {
  if (!d) return "Draft";
  return "Published " + new Intl.DateTimeFormat("en-US", { timeZone: centerConfig.timezone, month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function PolicyList({ entries }: { entries: KnowledgeEntry[] }) {
  return (
    <section aria-labelledby="policies">
      <div className="flex items-baseline justify-between">
        <h2 id="policies" className="text-base font-semibold tracking-tight">Center policies</h2>
        <p className="mono text-xs text-ink-3">{entries.length} published</p>
      </div>
      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <details className="card overflow-hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span>{e.title}</span>
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev shrink-0 text-ink-3"><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <div className="reveal">
                <div className="px-4 pb-4 text-sm leading-relaxed text-ink-2">
                  <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{e.policyText}</p>
                  <p className="mono mt-2 text-[11px] text-ink-3">{formatPublished(e.publishedAt)}</p>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
