"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/** Keep navigation feedback accessible without adding a visible loading indicator. */
export function NavigationLink({ children, className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={`relative ${className}`}>
    {children}
    <NavigationHint />
  </Link>;
}

function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span role="status" className="sr-only" data-navigation-pending={pending || undefined}>
    {pending ? "Loading destination" : null}
  </span>;
}
