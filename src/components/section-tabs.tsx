"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Issue 015: the header lives in the route layout and stays mounted across
// navigation, so the active section comes from the pathname, not a page prop.
export function SectionTabs({ items, current }: { items: { href: string; label: string }[]; current?: string }) {
  const pathname = usePathname();
  const active = current ?? pathname ?? "";
  // The most specific matching href wins, so /operator/inbox/<id> lights Inbox, not Knowledge.
  const matched = items.filter((s) => active === s.href || active.startsWith(s.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <nav aria-label="Section" className="flex basis-full gap-1 sm:ml-4 sm:basis-auto">
      {items.map((s) => {
        const on = matched?.href === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={
              "flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
              (on ? "bg-surface text-ink ring-1 ring-line" : "text-ink-3 hover:text-ink")
            }
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
