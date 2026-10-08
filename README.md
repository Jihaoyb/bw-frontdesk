# AI Front Desk (prototype)

Mobile-friendly AI front desk for one fictional childcare center, with Parent and Operator views. See `issues/prd.md` and `CONTEXT.md`.

## Run locally

```
npm install
cp .env.example .env.local   # or: npx vercel env pull .env.local
npm run migrate              # applies db/migrations/*.sql to DATABASE_URL
npm run dev
```

`npm test` runs Vitest against `DATABASE_URL` (uses `.env.test.local` first if present). `npm run lint && npm run typecheck` before commit.

Each browser gets its own demo session (httpOnly cookie) with seeded policies; the Parent/Operator switch is a reviewer convenience, not authentication.
