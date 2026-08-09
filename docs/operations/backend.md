# Todd backend operations

This document covers only Todd's brain and backend. The 3D room, frog, movement, animation, and world remain a separate subsystem.

## Runtime modes

`TODD_RUNTIME_MODE` is mandatory in production:

- `demo`: fixtures are allowed; mock AI is allowed; brain mutations still require PostgreSQL.
- `test`: deterministic providers and disposable PostgreSQL are allowed.
- `live`: PostgreSQL, OpenAI, independent admin/cron/fingerprint secrets, exact `PUBLIC_ORIGIN`, and an ingress-owned `CLIENT_IP_HEADER` are mandatory; mock AI and silent fixture fallback are rejected.

Copy `.env.example` and replace every `change-*` value with an independent random secret. Never reuse the admin, cron, fingerprint, or provider secrets.

## Local verification

```bash
npm ci
npm run prisma:generate
npm run test:unit
npm run test:postgres
npm run lint
npm run typecheck
TODD_RUNTIME_MODE=demo AI_PROVIDER=mock npm run build
```

`npm run test:postgres` starts a disposable PostgreSQL cluster with `pg_virtualenv`, rehearses a dataful legacy upgrade, deploys the full migration chain twice, executes concurrency, rollback, and visitor-to-decision tests, then destroys the cluster.

## Production release order

1. Back up the database and verify the backup can be listed/read.
2. Configure `TODD_RUNTIME_MODE=live`, `DATABASE_URL`, `ADMIN_SECRET`, `CRON_SECRET`, `FINGERPRINT_SECRET`, `PUBLIC_ORIGIN`, `CLIENT_IP_HEADER`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.
3. Run `npm run db:migrate:deploy` once as a release step, not from every application replica.
4. Deploy the application.
5. Verify `/api/health/live` returns `200`.
6. Verify `/api/health/ready` returns `200` and reports `live`; this proves runtime configuration, durable-brain schema, and genesis records without publishing provider details.
7. Submit a controlled suggestion, invoke the protected queue endpoint, invoke the worker, and confirm one terminal run and one decision.
8. Check that duplicate queue delivery returns the existing logical run and does not create a second decision.

Never run `prisma migrate dev` or `prisma db push` in production. Never run the seed command against production.

## Scheduler

- `/api/cron/decision` queues one eligible suggestion with a five-minute idempotency key.
- `/api/cron/worker` claims one due run with a lease and fencing token.
- Both require the configured cron bearer token in the `Authorization` header.
- Missing server configuration returns `503`; bad credentials return `401`.

The worker persists intent before contacting the provider. Provider output is schema-validated and policy-checked. The final decision, thought, memory, personality update, activity, safe config action, and outbox event commit together.

## Health and state

- `/api/health/live`: process liveness only.
- `/api/health/ready`: validates runtime configuration plus migrated PostgreSQL/genesis state.
- `/api/brain/state`: public, sanitized mood/activity/thought/latest-decision state; it excludes provider, model, run identifiers, attempts, private context, and private reasoning.

Alert on readiness failures, terminal decision runs, repeated retries, expired leases, and growing pending outbox counts. Logs may include run ID, status, provider, model, latency, and token usage. Logs must not include secrets, raw authorization headers, visitor IPs, full prompts, or private model output.

## Recovery

- Expired run leases are safely reclaimable with a new fencing token.
- An expired final-attempt lease is terminalized and releases its suggestion instead of stranding work.
- A stale worker cannot commit after losing its lease.
- Terminal provider failure returns the suggestion to `PENDING` for later operator review.
- Config rollback follows the recorded parent config under the same advisory lock used by Todd's config changes.
- Autonomous social posting is deliberately disabled until a separate approved outbox consumer is implemented and reviewed.

Before restoring a backup, stop workers or pause autonomy. Restore into a separate database first, run migrations and readiness checks there, then switch traffic deliberately.
