import Link from "next/link";
import { centerConfig } from "@/lib/center-config";
import { SectionTabs } from "./section-tabs";

export type Perspective = "parent" | "operator";

const subnav: Record<Perspective, { href: string; label: string }[]> = {
  parent: [
    { href: "/parent", label: "Conversation" },
    { href: "/parent/policies", label: "Policies" },
  ],
  operator: [
    { href: "/operator/inbox", label: "Inbox" },
    { href: "/operator/questions", label: "Questions" },
    { href: "/operator", label: "Knowledge" },
  ],
};

// Issue 014: one quiet bar. Center name, section tabs, and the reviewer switch
// as a small segmented control on the right. Desktop widens; nothing stacks.
// Issue 015: rendered once per perspective from the route layout, so it stays
// put while pages load; `current` is only for static rendering outside the router.
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
        <SectionTabs items={subnav[active]} current={current} />
      </div>
      <p className="sr-only">Switching perspective is a demo convenience for reviewers, not a login. Both views show the same demo session.</p>
    </header>
  );
}
