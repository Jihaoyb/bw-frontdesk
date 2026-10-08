import { CenterInfo } from "@/components/center-info";
import { PerspectiveNav } from "@/components/perspective-nav";
import { PolicyList } from "@/components/policy-list";
import { ResetDemo } from "@/components/reset-demo";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  const session = await getActiveSession();
  const entries = await listPublishedKnowledge(session.id);
  return (
    <>
      <PerspectiveNav active="operator" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <CenterInfo />
        <PolicyList entries={entries} />
        <ResetDemo confirming={reset === "confirm"} resetCount={session.resetCount} />
        <p className="text-xs text-stone-400">Demo session {session.id.slice(0, 8)}</p>
      </main>
    </>
  );
}
