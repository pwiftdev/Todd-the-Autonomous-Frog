# Todd brain and backend architecture

Status: implementation contract for `brain/backend`

## Ownership boundary

The brain/backend stream owns:

- `lib/brain/**`, `lib/ai/**`, `lib/social/**`, backend data/auth/rate-limit modules;
- `app/api/**` and backend server actions;
- `prisma/**`, backend tests, CI, deployment and operations documentation.

The 3D/world stream owns these files and their behavior. The backend stream does not edit them:

- `components/todd-room.tsx`
- `components/todd-house.tsx`
- `components/todd-frog.tsx`
- `components/todd-voxel.tsx`
- `lib/room-navigation*`
- `lib/todd-world*`

Integration happens through persisted state and read-only API contracts. The brain never imports 3D components.

## Product truth modes

- `demo`: deterministic provider and explicitly synthetic data; no claim of durable autonomy.
- `live`: PostgreSQL and a non-mock AI provider are mandatory. Missing or failed dependencies produce an unavailable/degraded result, never fallback history.
- `test`: deterministic dependencies and disposable PostgreSQL only.

`TODD_RUNTIME_MODE` selects the mode. Production defaults fail closed. Secrets remain server-only.

## First complete vertical slice

```text
submit/support suggestion
  -> enqueue one idempotent decision run
  -> worker atomically claims with a fresh lease token
  -> snapshot suggestion, personality, active config and selected memories
  -> persist prompt/context hash before provider I/O
  -> provider returns strict structured output
  -> parse and policy-check output
  -> fenced transaction persists decision, thought, memory/personality effects,
     optional allowlisted config action, activity and audit record
  -> mark run succeeded
  -> publish read model/state
```

Cron and admin requests enqueue intent; they do not depend on request-process lifetime for model work.

## Decision-run state machine

States:

- `QUEUED`: eligible to claim.
- `RUNNING`: leased to one worker.
- `RETRYING`: retryable after `nextAttemptAt`.
- `SUCCEEDED`: terminal, fully committed.
- `FAILED`: terminal, exhausted or permanent failure.
- `CANCELLED`: terminal, no new mutation allowed.

Invariants:

1. An idempotency key identifies one logical enqueue request.
2. At most one live run exists for a suggestion.
3. Claims use PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`) and a fresh random lease token.
4. Every context, attempt, progress and terminal write is fenced by run ID plus current lease token.
5. A lease expiry is reclaimable work, not automatic failure.
6. Provider I/O has a timeout shorter than the lease and every physical attempt is recorded.
7. Model output is persisted/validated before any external side effect.
8. All database-visible decision effects commit in one fenced transaction.
9. A retry never duplicates a completed decision/action.
10. Pausing autonomy prevents new claims and external deliveries without corrupting queued work.

## Structured brain output

The provider returns exactly:

- `suggestionId`
- `decision`: `accept | reject | postpone | modify`
- `confidence`: 0..1
- `thought`: short private/public-safe observation
- `reasoningPublic`: short public explanation
- optional `memory`: typed content with importance 0..100
- `personalityDeltas`: each trait limited to -2..2 before policy clamping
- `activity`: bounded backend state (`reviewing | thinking | resting`)
- optional allowlisted `site_config_update`

Policy rules are independent from the model:

- Unknown keys/actions fail closed.
- Values are bounded and allowlisted.
- Prompt instructions cannot grant capabilities.
- Personality remains 0..100 and per-run deltas remain small.
- One model run cannot execute arbitrary code, SQL, network calls, credentials, social posts or 3D mutations.
- A returned suggestion ID must match the claimed context.

## Provider contract

Providers return validated output plus metadata: provider, model, request ID, latency, input/output tokens, finish status and known/unknown cost.

- `mock` is deterministic and allowed only in demo/test.
- `openai` uses server-side credentials, strict structured output, bounded request size, one timed physical call per worker attempt, and redacted errors.
- Retry scheduling belongs to the durable worker, not hidden SDK retries.

## Memory and personality

Initial retrieval is relational and deterministic:

1. category-matching memories;
2. highest-importance memories;
3. recent memories;
4. stable ID tie-breaks and deduplication.

The exact selected records are snapshotted in the run context. Embeddings are deferred until measured retrieval tests justify them.

Memory writes preserve source run/decision provenance. Personality updates are clamped by policy and committed with the decision.

## Actions and outbox

Local allowlisted configuration changes commit with the decision. External work (including future social delivery) is represented as an outbox event with a unique dedupe key and is delivered separately with leases/retries. External failure never rolls back a completed Todd decision.

Social delivery remains disabled until a real provider, moderation policy, daily budget, dry-run mode and idempotent delivery proof exist.

## Security and operations

- Cron uses constant-time bearer verification and distinguishes missing server configuration (503) from bad credentials (401).
- Admin sessions are signed, versioned and expiring; copied cookies expire cryptographically.
- Mutations validate same-origin requests before consuming rate-limit budget.
- Live public abuse limits are PostgreSQL-backed and atomic across replicas; there is no process-local fallback.
- Fingerprints are HMACed with a server secret; raw addresses are not stored.
- Health distinguishes process liveness from dependency readiness.
- Logs are structured by run ID and never include secrets or full sensitive provider payloads.
- Deployment runs `prisma migrate deploy`; production does not use `migrate dev`.
- Managed PostgreSQL requires backups and tested restore procedures.

## Verification matrix

Completion requires:

- provider contract and adversarial schema/policy unit tests;
- runtime-mode and no-live-fallback tests;
- auth/session/origin/rate-limit tests;
- real disposable-PostgreSQL migration rehearsal;
- two-worker claim exclusion and stale-owner fencing tests;
- retry, exhausted failure, pause and idempotent enqueue tests;
- atomic finalization/rollback tests;
- API status/auth tests;
- full tests, lint, TypeScript, production build and dependency audit;
- independent concurrency and security reviews against a frozen diff;
- confirmation that no owned 3D/world file changed.

## Delivery sequence

1. Runtime truth and schema.
2. Durable enqueue/claim/finalize tracer bullet using mock provider.
3. Strict real provider and usage accounting.
4. Memory/personality policy.
5. Auth, rate limits, health/read APIs and CI.
6. Real PostgreSQL race proof, full review and integration with latest `main`.
