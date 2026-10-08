import Link from "next/link";
import { centerConfig } from "@/lib/center-config";

export type Perspective = "parent" | "operator";

const subnav: Record<Perspective, { href: string; label: string }[]> = {
  parent: [
    { href: "/parent", label: "Conversation" },
    { href: "/parent/policies", label: "Policies" },
  ],
  operator: [
    { href: "/operator/inbox", label: "Inbox" },
    { href: "/operator", label: "Knowledge" },
  ],
};

// Issue 014: one quiet bar. Center name, section tabs, and the reviewer switch
// as a small segmented control on the right. Desktop widens; nothing stacks.
export function PerspectiveNav({ active, current }: { active: Perspective; current?: string }) {
  const tab = (p: Perspective, label: string) => (
    <Link
      href={subnav[p][0].href}
      aria-current={active === p ? "page" : undefined}
      className={
        "flex min-h-9 flex-1 items-center justify-center rounded-full px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
        (active === p ? "bg-ink text-white" : "text-ink-2 hover:text-ink")
      }
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:px-8">
        <div className="min-w-0 flex-1 sm:flex-none">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{centerConfig.name}</p>
          <p className="hidden text-xs text-ink-3 sm:block">{active === "parent" ? "Front desk · answers from published policies" : "Staff"}</p>
        </div>
        <nav aria-label="Perspective" className="flex w-36 shrink-0 rounded-full bg-surface p-0.5 ring-1 ring-line sm:order-last sm:ml-auto sm:w-40">
          {tab("parent", "Parent")}
          {tab("operator", "Staff")}
        </nav>
        <nav aria-label="Section" className="flex basis-full gap-1 sm:ml-4 sm:basis-auto">
          {subnav[active].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={current === s.href ? "page" : undefined}
              className={
                "flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
                (current === s.href ? "bg-surface text-ink ring-1 ring-line" : "text-ink-3 hover:text-ink")
              }
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="sr-only">Switching perspective is a demo convenience for reviewers, not a login. Both views show the same demo session.</p>
    </header>
  );
}
