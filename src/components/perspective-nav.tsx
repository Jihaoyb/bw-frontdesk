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
        "flex-1 text-center rounded-md px-3 py-2 text-sm font-medium " +
        (active === p ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-800")
      }
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-xl px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-stone-500">AI Front Desk · demo</p>
        <h1 className="text-lg font-semibold">{centerConfig.name}</h1>
        <nav aria-label="Perspective" className="mt-3 flex gap-2">
          {tab("parent", "Parent")}
          {tab("operator", "Operator")}
        </nav>
        <nav aria-label="Section" className="mt-2 flex gap-4 text-sm">
          {subnav[active].map((s) => (
            <Link key={s.href} href={s.href} className={current === s.href ? "font-semibold underline" : "text-stone-600"}>
              {s.label}
            </Link>
          ))}
        </nav>
        <p className="mt-2 text-xs text-stone-500">
          Switching perspective is a demo convenience for reviewers, not a login. Both views show the same demo session.
        </p>
      </div>
    </header>
  );
}
