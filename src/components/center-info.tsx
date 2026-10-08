import { centerConfig } from "@/lib/center-config";

// Copy here states hours and a contact fallback only. It must not imply that
// staff are online now, that a reply arrives by a certain time, or that a
// message has been delivered to a person.
export function CenterInfo() {
  return (
    <section aria-labelledby="center-info" className="card p-4">
      <h2 id="center-info" className="eyebrow">Hours and contact</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
        <div>
          <dt className="text-ink-3">Care hours</dt>
          <dd className="font-medium">{centerConfig.careHours}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Office hours</dt>
          <dd className="font-medium">{centerConfig.officeHours}</dd>
          <dd className="text-xs text-ink-3">Staff read messages during office hours.</dd>
        </div>
        <div>
          <dt className="text-ink-3">Front office</dt>
          <dd className="font-medium"><a className="underline decoration-line underline-offset-2 hover:decoration-ink-3" href={`tel:${centerConfig.contactPhone.replace(/\D/g, "")}`}>{centerConfig.contactPhone}</a></dd>
          <dd className="break-all text-xs"><a className="text-ink-2 underline decoration-line underline-offset-2" href={`mailto:${centerConfig.contactEmail}`}>{centerConfig.contactEmail}</a></dd>
        </div>
      </dl>
    </section>
  );
}
