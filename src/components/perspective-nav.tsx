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
    { href: "/operator", label: "Handbook" },
  ],
};

// Rendered once per perspective; switching keeps the same demo session.
export function PerspectiveNav({ active, current }: { active: Perspective; current?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className={`mx-auto flex w-full ${active === "parent" ? "max-w-[1104px]" : "max-w-7xl"} flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:px-8`}>
        <div className="min-w-0 flex-1 sm:flex-none">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{centerConfig.name}</p>
          <p className="hidden text-xs text-ink-3 sm:block">{active === "parent" ? "Front desk · answers from published policies" : "Staff"}</p>
        </div>
        <nav aria-label="Perspective" className="shrink-0 sm:order-last sm:ml-auto">
          <Link href={active === "operator" ? "/parent" : "/operator/inbox"} className="btn-ghost whitespace-nowrap">
            {active === "operator" ? "Parent View" : "Operator View"}
            <span aria-hidden="true" className="ml-1.5">&gt;</span>
          </Link>
        </nav>
        {active === "parent" && <SectionTabs items={subnav[active]} current={current} />}
      </div>
      {active === "operator" && <div className="mx-auto mt-3 w-full max-w-7xl px-4 lg:px-8"><SectionTabs items={subnav.operator} current={current} lower /></div>}
      <p className="sr-only">Switching perspective is a demo convenience for reviewers, not a login. Both views show the same demo session.</p>
    </header>
  );
}
