import { notFound } from "next/navigation";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard, originLabel } from "@/components/request-card";
import { getKnowledgeEntry } from "@/lib/knowledge";
import { getRequest } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

// Reading a request changes nothing: no review mark, no approval.
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getActiveSession();
  const request = await getRequest(session.id, id); // scoped: other sessions' ids → null
  if (!request) notFound();
  const knownPolicy = request.knownPolicyEntryId ? await getKnowledgeEntry(session.id, request.knownPolicyEntryId) : null;
  return (
    <>
      <PerspectiveNav active="operator" current="/operator/inbox" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <p className="text-xs text-stone-500">Origin: <span data-origin={request.origin}>{originLabel[request.origin]}</span></p>
        <RequestCard request={request} knownPolicy={knownPolicy} />
        <p className="text-xs text-stone-500">Review, reply, and close actions arrive in later tickets. Viewing this page records nothing.</p>
      </main>
    </>
  );
}
