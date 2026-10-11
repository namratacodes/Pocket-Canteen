# Operations notes

- Run exactly **one** backend instance. The background jobs and the in-memory rate limits assume a single process.
- Use the host's pooled Postgres URL as `DATABASE_URL`. Health check path: `/ready` (`/health` only says the process is up).
- Set every variable from `.env.example` with real secrets. For production use `PAYMENT_GATEWAY=razorpay` plus the Razorpay keys.
- Razorpay dashboard webhook URL: `https://<host>/api/v1/webhooks/razorpay`.
- Turn on automated database backups. The wallet ledger cannot be regenerated.
- Free hosting tiers may sleep. Warm the service (open `/ready`) before a demo.
- ML service: set `ML_SERVICE_URL` to enable it. If it is unset, slow, or failing, the backend uses the formula fallback automatically.
- Local stack: `docker compose up --build` from the repo root, then open http://localhost:4000/ready
- Load test (not part of `npm test`): `npx tsx ops/loadtest.ts` against a running backend with seeded canteens.
