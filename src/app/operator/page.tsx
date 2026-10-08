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
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <CenterInfo />
        <KnowledgeEditor entries={entries} notice={notice} />
        <ResetDemo confirming={reset === "confirm"} resetCount={session.resetCount} />
        <p className="text-xs text-stone-400">Demo session {session.id.slice(0, 8)}</p>
      </main>
    </>
  );
}
