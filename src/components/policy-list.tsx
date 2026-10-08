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
        <p className="text-xs text-stone-500">{entries.length} published</p>
      </div>
      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <details className="group card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                <span>{e.title}</span>
                <span aria-hidden className="text-stone-400 transition group-open:rotate-90">›</span>
              </summary>
              <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-3 text-sm leading-relaxed">
                <p className="whitespace-pre-wrap">{e.policyText}</p>
                <p className="mt-2 text-xs text-stone-500">{formatPublished(e.publishedAt)}</p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
