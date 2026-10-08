import { CenterInfo } from "@/components/center-info";
import { PolicyList } from "@/components/policy-list";
import { listPublishedKnowledge } from "@/lib/knowledge";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function ParentPoliciesPage() {
  const session = await getActiveSession();
  const entries = await listPublishedKnowledge(session.id);
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1104px] flex-1 gap-10 px-4 py-5 lg:px-8">
        <main className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <PolicyList entries={entries} />
          <div className="lg:hidden"><CenterInfo /></div>
        </main>
        <aside className="hidden w-[320px] shrink-0 lg:block"><div className="sticky top-20"><CenterInfo /></div></aside>
      </div>
    </>
  );
}
