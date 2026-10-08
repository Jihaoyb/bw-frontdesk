import { centerConfig } from "@/lib/center-config";

// Copy here states hours and a contact fallback only. It must not imply that
// staff are online now, that a reply arrives by a certain time, or that a
// message has been delivered to a person.
export function CenterInfo() {
  return (
    <section aria-labelledby="center-info" className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 id="center-info" className="text-sm font-semibold">Hours and contact</h2>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-stone-500">Care hours</dt>
          <dd>{centerConfig.careHours}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-stone-500">Office hours</dt>
          <dd>{centerConfig.officeHours}. Staff read messages during office hours.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-stone-500">Front office</dt>
          <dd>
            <a className="underline" href={`tel:${centerConfig.contactPhone.replace(/\D/g, "")}`}>{centerConfig.contactPhone}</a>
            {" · "}
            <a className="underline break-all" href={`mailto:${centerConfig.contactEmail}`}>{centerConfig.contactEmail}</a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
