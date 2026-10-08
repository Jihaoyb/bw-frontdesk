import { centerConfig } from "@/lib/center-config";

// Copy here states hours and a contact fallback only. It must not imply that
// staff are online now, that a reply arrives by a certain time, or that a
// message has been delivered to a person.
export function CenterInfo() {
  return (
    <section aria-labelledby="center-info" className="card p-4">
      <h2 id="center-info" className="eyebrow">Hours and contact</h2>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-stone-500">Care hours</dt>
          <dd className="font-medium">{centerConfig.careHours}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Office hours</dt>
          <dd className="font-medium">{centerConfig.officeHours}</dd>
          <dd className="text-xs text-stone-500">Staff read messages during office hours.</dd>
        </div>
        <div>
          <dt className="text-stone-500">Front office</dt>
          <dd className="font-medium"><a className="underline decoration-stone-300 underline-offset-2" href={`tel:${centerConfig.contactPhone.replace(/\D/g, "")}`}>{centerConfig.contactPhone}</a></dd>
          <dd className="break-all text-xs"><a className="text-stone-600 underline decoration-stone-300 underline-offset-2" href={`mailto:${centerConfig.contactEmail}`}>{centerConfig.contactEmail}</a></dd>
        </div>
      </dl>
    </section>
  );
}
