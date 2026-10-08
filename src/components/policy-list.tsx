import type { KnowledgeEntry } from "@/lib/knowledge";
import { centerConfig } from "@/lib/center-config";

function formatPublished(d: Date | null): string {
  if (!d) return "Draft";
  return "Published " + new Intl.DateTimeFormat("en-US", {
    timeZone: centerConfig.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function PolicyList({ entries }: { entries: KnowledgeEntry[] }) {
  return (
    <section aria-labelledby="policies">
      <h2 id="policies" className="text-sm font-semibold">Center policies</h2>
      <p className="mt-1 text-xs text-stone-500">{entries.length} published entries</p>
      <ul className="mt-2 space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <details className="group rounded-lg border border-stone-200 bg-white">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium flex justify-between gap-3">
                <span>{e.title}</span>
                <span aria-hidden className="text-stone-400 group-open:rotate-90 transition">›</span>
              </summary>
              <div className="border-t border-stone-100 px-4 py-3 text-sm leading-relaxed">
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
