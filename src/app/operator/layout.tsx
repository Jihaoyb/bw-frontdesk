import { PerspectiveNav } from "@/components/perspective-nav";

// The header stays mounted across operator routes. No route-wide loading
// fallback: transitions retain the current content and links show pending feedback.
export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PerspectiveNav active="operator" />
      {children}
    </>
  );
}
