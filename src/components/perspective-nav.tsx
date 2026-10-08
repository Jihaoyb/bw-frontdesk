import Link from "next/link";
import { centerConfig } from "@/lib/center-config";

export type Perspective = "parent" | "operator";

const subnav: Record<Perspective, { href: string; label: string }[]> = {
  parent: [
    { href: "/parent", label: "Conversation" },
    { href: "/parent/policies", label: "Center policies" },
  ],
  operator: [
    { href: "/operator/inbox", label: "Inbox" },
    { href: "/operator", label: "Knowledge" },
  ],
};

export function PerspectiveNav({ active, current }: { active: Perspective; current?: string }) {
  const tab = (p: Perspective, label: string) => (
    <Link
      href={subnav[p][0].href}
      aria-current={active === p ? "page" : undefined}
      className={
        "flex-1 rounded-full px-2 py-1 text-center text-sm font-medium transition " +
        (active === p ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900")
      }
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-xl px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{centerConfig.name}</h1>
            <p className="eyebrow">AI front desk · demo</p>
          </div>
          <nav aria-label="Perspective" className="flex w-36 shrink-0 rounded-full bg-stone-100 p-0.5">
            {tab("parent", "Parent")}
            {tab("operator", "Operator")}
          </nav>
        </div>
        <nav aria-label="Section" className="-mb-2 mt-2 flex gap-5 text-sm">
          {subnav[active].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={
                "border-b-2 pb-2 transition " +
                (current === s.href ? "border-stone-900 font-semibold text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800")
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
