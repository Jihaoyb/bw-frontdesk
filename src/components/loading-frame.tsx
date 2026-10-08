// Issue 015: loading frames. Each route shows its own layout's shapes while the
// page streams in, so a tap moves the screen within one frame. Shapes only; no
// copy, so nothing here can promise or imply anything.

function Bar({ w, h = "h-3.5" }: { w: string; h?: string }) {
  return <div aria-hidden className={`skeleton ${h} ${w}`} />;
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-4 py-5 lg:px-8">
      {children}
    </div>
  );
}

function Rail() {
  return (
    <aside aria-hidden className="hidden w-[320px] shrink-0 lg:block">
      <div className="sticky top-20 flex flex-col gap-4">
        <div className="card flex flex-col gap-3 p-4"><Bar w="w-24" h="h-3" /><Bar w="w-full" /><Bar w="w-3/4" /><Bar w="w-5/6" /></div>
        <div className="card flex flex-col gap-3 p-4"><Bar w="w-28" h="h-3" /><Bar w="w-full" /><Bar w="w-2/3" /></div>
      </div>
    </aside>
  );
}

export function ConversationFrame() {
  return (
    <Frame label="Loading the conversation">
      <main className="flex w-full min-w-0 max-w-[680px] flex-1 flex-col gap-6" aria-hidden>
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex justify-end"><div className="skeleton h-11 w-[60%] rounded-[20px]" /></div>
          <div className="flex max-w-[92%] flex-col gap-2.5"><Bar w="w-32" h="h-3" /><Bar w="w-[92%]" /><Bar w="w-[78%]" /><Bar w="w-[48%]" /></div>
          <div className="flex justify-end"><div className="skeleton h-11 w-[45%] rounded-[20px]" /></div>
          <div className="flex max-w-[92%] flex-col gap-2.5"><Bar w="w-32" h="h-3" /><Bar w="w-[88%]" /><Bar w="w-[64%]" /></div>
        </div>
        <div className="skeleton h-14 w-full rounded-[26px]" />
      </main>
      <Rail />
    </Frame>
  );
}

export function PoliciesFrame() {
  return (
    <Frame label="Loading the policies">
      <main className="flex w-full min-w-0 max-w-[680px] flex-1 flex-col gap-3" aria-hidden>
        <Bar w="w-40" h="h-6" />
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card flex items-center gap-3 px-4 py-3.5"><Bar w={i % 2 ? "w-1/2" : "w-2/3"} /><div className="ml-auto skeleton h-3 w-16" /></div>)}
      </main>
      <Rail />
    </Frame>
  );
}

function InboxColumn() {
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-hidden>
      <div className="flex gap-2"><div className="skeleton h-9 w-24 rounded-full" /><div className="skeleton h-9 w-20 rounded-full" /><div className="skeleton h-9 w-14 rounded-full" /></div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card grid grid-cols-[4px_minmax(0,1fr)] gap-3.5 p-3.5">
          <div className="skeleton rounded-sm" />
          <div className="flex flex-col gap-2.5"><Bar w="w-32" h="h-3" /><Bar w={i % 2 ? "w-3/4" : "w-5/6"} h="h-4" /><div className="flex gap-1.5"><div className="skeleton h-6 w-28 rounded-full" /><div className="skeleton h-6 w-20 rounded-full" /></div></div>
        </div>
      ))}
    </div>
  );
}

export function InboxFrame() {
  return (
    <Frame label="Loading the inbox">
      <div className="grid w-full flex-1 gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
        <InboxColumn />
        <section className="hidden min-w-0 flex-col gap-3 lg:flex" aria-hidden>
          <Bar w="w-48" h="h-6" />
          <div className="card divide-y divide-line-soft">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3 px-4 py-3.5"><Bar w={i % 2 ? "w-1/2" : "w-2/3"} /><div className="ml-auto skeleton h-3 w-14" /></div>)}</div>
        </section>
      </div>
    </Frame>
  );
}

export function RequestFrame() {
  return (
    <Frame label="Loading the request">
      <div className="grid w-full flex-1 gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="hidden lg:block"><div className="sticky top-20"><InboxColumn /></div></div>
        <main className="flex min-w-0 max-w-[760px] flex-col gap-5" aria-hidden>
          <div className="flex items-center gap-3"><div className="skeleton h-6 w-24 rounded-full" /><Bar w="w-28" h="h-3" /></div>
          <Bar w="w-4/5" h="h-7" />
          <div className="card h-12" />
          <div className="grid gap-2.5 sm:grid-cols-2"><div className="card flex flex-col gap-2 p-3.5"><Bar w="w-20" h="h-3" /><Bar w="w-3/4" h="h-4" /></div><div className="card flex flex-col gap-2 p-3.5"><Bar w="w-20" h="h-3" /><Bar w="w-1/2" h="h-4" /></div></div>
          <div className="flex justify-end"><div className="skeleton h-11 w-[60%] rounded-[20px]" /></div>
          <div className="card flex flex-col gap-3 p-4"><Bar w="w-36" h="h-4" /><div className="skeleton h-20 w-full rounded-2xl" /><div className="skeleton h-11 w-32 rounded-full" /></div>
        </main>
      </div>
    </Frame>
  );
}

export function KnowledgeFrame() {
  return (
    <Frame label="Loading the knowledge editor">
      <div className="grid w-full flex-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)]" aria-hidden>
        <div className="flex flex-col gap-2"><Bar w="w-28" h="h-6" />{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="flex items-center gap-2.5 py-2"><div className="skeleton h-2 w-2 rounded-full" /><Bar w={i % 2 ? "w-1/2" : "w-2/3"} /></div>)}</div>
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="card flex items-center gap-3 px-4 py-4"><Bar w="w-1/2" h="h-4" /><div className="ml-auto skeleton h-3 w-20" /></div>)}</div>
      </div>
    </Frame>
  );
}
