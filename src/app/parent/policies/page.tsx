import { CenterInfo } from "@/components/center-info";
import { PerspectiveNav } from "@/components/perspective-nav";
import { PolicyList } from "@/components/policy-list";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function ParentPoliciesPage() {
  const session = await getActiveSession();
  const entries = await listPublishedKnowledge(session.id);
  return (
    <>
      <PerspectiveNav active="parent" current="/parent/policies" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <CenterInfo />
        <PolicyList entries={entries} />
      </main>
    </>
  );
}
