import { PerspectiveNav } from "@/components/perspective-nav";

// Issue 015: the header is part of the layout, so it stays mounted while a
// page in this perspective loads and the loading frame renders beneath it.
export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PerspectiveNav active="operator" />
      {children}
    </>
  );
}
