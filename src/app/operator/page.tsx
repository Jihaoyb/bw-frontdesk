import { CenterInfo } from "@/components/center-info";
import { KnowledgeEditor } from "@/components/knowledge-editor";
import { PerspectiveNav } from "@/components/perspective-nav";
import { ResetDemo } from "@/components/reset-demo";
import { listAllKnowledge } from "@/lib/knowledge";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; saved?: string; published?: string; error?: string }>;
}) {
  const { reset, saved, published, error } = await searchParams;
  const session = await getActiveSession();
  const entries = await listAllKnowledge(session.id);
  const notice = error
    ? ({ kind: "error", message: error } as const)
    : published
      ? ({ kind: "published", entryId: published } as const)
      : saved
        ? ({ kind: "saved", entryId: saved } as const)
        : null;
  return (
    <>
      <PerspectiveNav active="operator" current="/operator" />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-5 lg:px-8">
        <KnowledgeEditor entries={entries} notice={notice} />
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
          <div />
          <div className="flex max-w-[760px] flex-col gap-3">
            <CenterInfo />
            <ResetDemo confirming={reset === "confirm"} resetCount={session.resetCount} />
            <p className="mono text-xs text-ink-3">Demo session {session.id.slice(0, 8)}</p>
          </div>
        </div>
      </main>
    </>
  );
}
