import { AskStaffForm } from "@/components/ask-staff-form";
import { CenterInfo } from "@/components/center-info";
import { PerspectiveNav } from "@/components/perspective-nav";
import { RequestCard } from "@/components/request-card";
import { centerConfig } from "@/lib/center-config";
import { getKnowledgeEntry } from "@/lib/knowledge";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { listMessages, listRequests } from "@/lib/requests";
import { getActiveSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-US", { timeZone: centerConfig.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function ParentPage() {
  const session = await getActiveSession();
  const [messages, requests] = await Promise.all([listMessages(session.id), listRequests(session.id)]);
  const byMessage = new Map(requests.filter((r) => r.questionMessageId).map((r) => [r.questionMessageId as string, r]));
  const knownPolicies = new Map(
    await Promise.all(
      requests.filter((r) => r.knownPolicyEntryId).map(async (r) => [r.id, await getKnowledgeEntry(session.id, r.knownPolicyEntryId as string)] as const),
    ),
  );

  return (
    <>
      <PerspectiveNav active="parent" current="/parent" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-4">
        <section aria-labelledby="conversation" className="space-y-3">
          <h2 id="conversation" className="text-sm font-semibold">Conversation</h2>
          {messages.length === 0 && <p className="text-sm text-stone-500">No messages yet. Ask a question below.</p>}
          <ol className="space-y-3">
            {messages.map((m) => {
              const req = byMessage.get(m.id);
              return (
                <li key={m.id} className="space-y-2">
                  <div className={"rounded-lg p-3 text-sm " + (m.speaker === "parent" ? "bg-stone-900 text-white" : "bg-white border border-stone-200")}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={"mt-1 text-xs " + (m.speaker === "parent" ? "text-stone-300" : "text-stone-500")}>
                      {m.speaker === "parent" ? "You" : m.speaker === "staff" ? m.staffName ?? "Staff" : "Front desk"} · {time.format(m.createdAt)}
                    </p>
                  </div>
                  {req && <RequestCard request={req} knownPolicy={knownPolicies.get(req.id) ?? null} />}
                </li>
              );
            })}
          </ol>
        </section>
        <AskStaffForm maxChars={MAX_QUESTION_CHARS} />
        <CenterInfo />
      </main>
    </>
  );
}
