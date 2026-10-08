# Persist isolated demo state in managed PostgreSQL

The Next.js application hosted on Vercel will access Neon PostgreSQL through server endpoints, with all mutable records scoped to an isolated demo session. This supports consistent parent/operator views, refresh persistence, and reliable request creation without relying on browser-only state or application-process memory. Neon will be provisioned through Vercel Marketplace after account and plan verification; the extra provisioning step is accepted in exchange for durable end-to-end behavior.
