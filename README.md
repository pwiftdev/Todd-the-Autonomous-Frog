# Todd — The Autonomous Frog

Todd is an autonomous AI frog whose personality, memories, website, public behavior, and voxel world evolve over time.

The product principle is simple:

> People suggest. Todd decides. Todd evolves.

Todd is influenced by the community, but he is not governed by it. Community support is one signal in his decision process—not a vote that automatically controls him.

This document is the engineering handoff for the current MVP. It explains what exists, what is simulated, how to run the project, the important safety boundaries, and the recommended path from the current prototype to a persistent autonomous Todd starting from Day 0.

## Project status

Last updated: August 9, 2026

The application is a polished functional prototype. The public UI and safe mutation architecture are implemented, but Todd is not yet powered by a real language model or a continuously running background worker.

| Area                        | Status                 | Notes                                                                                        |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| Public homepage             | Implemented            | Responsive editorial/swamp design with live-looking Todd state                               |
| Animated Todd               | Implemented            | Real-time voxel geometry rendered with React Three Fiber                                     |
| Todd's room                 | Prototype implemented  | Isometric voxel room with synchronized activity simulation                                   |
| Suggestions                 | Implemented            | Submission, categories, support counts, statuses, and public feed                            |
| Suggestion rate limiting    | MVP implemented        | In-memory limiter; needs a distributed store before multi-instance deployment                |
| Personality                 | Implemented            | Numeric persistent traits in Prisma with seeded defaults                                     |
| Memory                      | Data layer implemented | Relational memory model exists; semantic retrieval is not implemented                        |
| Thoughts                    | Implemented            | Public feed and event types exist; currently seeded or produced by mock cycles               |
| Decisions                   | Implemented            | Structured decision records and public reasoning                                             |
| Safe site changes           | Implemented            | Zod validation, key/value allowlist, versioned config, audit log, rollback                   |
| AI provider abstraction     | Implemented            | `AiProvider` interface and deterministic mock provider exist                                 |
| Real OpenAI provider        | Not implemented        | Requires official SDK, API key, structured output, retries, usage logging, and evals         |
| Scheduler endpoint          | Partially implemented  | Protected cron endpoint exists; no dedicated durable worker or queue                         |
| Social provider abstraction | Implemented            | Mock posting provider only                                                                   |
| Real X integration          | Not implemented        | Credentials, OAuth/API integration, delivery tracking, and policy controls required          |
| Admin panel                 | Implemented            | Pause/resume, manual cycles, inspection, rollback, and failure visibility                    |
| Clean Day 0 birth           | Not implemented        | Current seed and no-database fallback contain realistic fake history                         |
| Live room state             | Simulated              | Viewers follow a deterministic wall-clock loop; room activity is not persisted in PostgreSQL |
| Live event transport        | Not implemented        | Add Server-Sent Events or WebSockets for real cross-viewer state updates                     |
| Production deployment       | Not completed          | Docker development database and Vercel cron configuration are included                       |

## Important current-state warning

The application can render without a configured database by using `lib/default-data.ts`. This is useful for design work, but it is not persistent. Suggestions, decisions, memories, and configuration changes require PostgreSQL.

The current seed script also creates fake living history so the prototype feels active immediately. Do not use the current seed for Todd's public birth if the goal is to start from zero.

Before launching a real Todd, replace the existing demo seed with a genesis seed containing:

- Age: 0 days
- Zero reviewed suggestions
- Zero decisions and website changes
- Zero social posts
- Foundational identity and personality only
- Initial site configuration
- Initial room state
- One birth event and one initial thought

## Product behavior

The intended observable chain is:

1. A human submits a suggestion.
2. Todd retrieves relevant personality, memory, recent decisions, site state, social context, and support pressure.
3. Todd accepts, rejects, postpones, or modifies the suggestion.
4. Todd publishes concise reasoning.
5. Any proposed action is treated as untrusted input.
6. The server validates the action against a schema and allowlist.
7. Approved safe actions create a new site configuration version.
8. The decision, memory, thought, action, and audit record are stored.
9. The public site and room update to reflect what Todd decided and what he is doing.

Todd must never receive unrestricted filesystem access, shell access, SQL access, secrets, or arbitrary URL access.

## Current user-facing routes

| Route                | Purpose                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                  | Main experience, Todd status, voxel character, room, thoughts, suggestions, changes, and statistics |
| `/suggestions`       | Submit, browse, and support community suggestions                                                   |
| `/thoughts`          | Public cognition and event feed                                                                     |
| `/changelog`         | Auditable history of implemented autonomous changes                                                 |
| `/profile`           | Todd's mood, personality traits, preferences, and statistics                                        |
| `/admin`             | Protected development and operations panel                                                          |
| `/api/cron/decision` | Protected scheduled decision-cycle endpoint                                                         |

## Technology stack

### Application

- Next.js 16 App Router
- React 19
- TypeScript with strict checking
- Tailwind CSS
- Zod validation
- Lucide icons

### 3D world

- Three.js
- React Three Fiber
- Code-native voxel geometry; no static Todd image
- Viewport-aware rendering to avoid running the room canvas while far off-screen

### Data and backend

- PostgreSQL
- Prisma ORM
- Next.js server actions
- Next.js route handlers
- Versioned database-backed site configuration

### External providers

- `AiProvider` abstraction with a mock implementation
- `SocialProvider` abstraction with a mock implementation
- OpenAI and X credentials are intended to remain server-side only

## Repository structure

```text
app/
  actions.ts                  Public and admin server actions
  admin/page.tsx              Protected development panel
  api/cron/decision/route.ts  Protected scheduled decision endpoint
  changelog/page.tsx          Public change history
  profile/page.tsx            Todd profile
  suggestions/page.tsx        Suggestion submission and feed
  thoughts/page.tsx           Public thought stream
  page.tsx                    Homepage

components/
  todd-voxel.tsx              Reusable animated voxel frog model
  todd-room.tsx               Voxel room, furniture, activity loop, and movement
  todd-frog.tsx               Public wrapper for the voxel character
  suggestion-form.tsx         Suggestion input UX
  suggestion-card.tsx         Suggestion status and support UI
  site-header.tsx             Shared navigation
  page-frame.tsx              Shared secondary-page layout
  footer.tsx                  Shared footer

lib/
  ai/provider.ts              AI interface and deterministic mock provider
  social/provider.ts          Social interface and mock provider
  autonomy.ts                 Decision cycle and safe action execution
  validation.ts               Suggestion and AI-output schemas
  data.ts                     Public data queries and fallback selection
  default-data.ts             Non-persistent demo content
  prisma.ts                   Prisma client singleton
  admin-auth.ts               Admin secret verification
  rate-limit.ts               In-memory MVP rate limiter

prisma/
  schema.prisma               Persistent data model
  seed.ts                     Current demo seed
  migrations/                 PostgreSQL migration history
```

## Local development setup

### Prerequisites

- Node.js 20.9 or newer
- npm
- Docker Desktop, or access to a PostgreSQL instance

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Replace `ADMIN_SECRET` and `CRON_SECRET` with strong unique values.

4. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

5. Generate Prisma Client:

   ```bash
   npx prisma generate
   ```

6. Apply the database migration:

   ```bash
   npx prisma migrate dev
   ```

7. Seed the current demo history:

   ```bash
   npx prisma db seed
   ```

   Skip this step if preparing a clean Day 0 launch. Implement the genesis seed first.

8. Start the application:

   ```bash
   npm run dev
   ```

9. Open [http://localhost:3000](http://localhost:3000).

The admin panel is available at [http://localhost:3000/admin](http://localhost:3000/admin).

### Running without PostgreSQL

The public routes render fallback demo data when `DATABASE_URL` is missing or unavailable. This mode is only for visual development:

- Submissions are not stored.
- Admin database inspection is unavailable.
- Decision cycles cannot persist.
- Room activity is a browser visualization rather than a stored Todd state.

## Environment variables

| Variable          | Current use                               | Required                           |
| ----------------- | ----------------------------------------- | ---------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection used by Prisma      | Required for persistent behavior   |
| `ADMIN_SECRET`    | Creates the protected admin session       | Required for `/admin`              |
| `CRON_SECRET`     | Authorizes scheduled decision requests    | Required outside local development |
| `AI_PROVIDER`     | Currently expected to be `mock`           | Yes                                |
| `SOCIAL_PROVIDER` | Currently expected to be `mock`           | Yes                                |
| `OPENAI_API_KEY`  | Reserved for the planned real AI provider | Not used yet                       |
| `X_API_KEY`       | Reserved for a real X provider            | Not used yet                       |
| `X_API_SECRET`    | Reserved for a real X provider            | Not used yet                       |

Planned variables should include `OPENAI_MODEL`, explicit cost limits, worker identity, event-stream configuration, and provider-specific retry limits.

Never prefix private values with `NEXT_PUBLIC_`.

## Current architecture

```text
Browser
  ├─ Public pages
  ├─ Suggestion server actions
  ├─ Animated voxel Todd
  └─ Simulated synchronized room loop
          │
          ▼
Next.js server
  ├─ Public query layer
  ├─ Admin authentication
  ├─ Mock AI provider
  ├─ Mock social provider
  ├─ Zod validation
  ├─ Safe action allowlist
  └─ Cron route
          │
          ▼
PostgreSQL through Prisma
  ├─ Identity and personality
  ├─ Memories
  ├─ Suggestions and support
  ├─ Decisions and actions
  ├─ Site config versions
  ├─ Thoughts and journals
  ├─ Social posts
  └─ AI and audit logs
```

## Database model overview

### Todd identity

- `ToddState`: created date, mood, favorite/least favorite things, current status, autonomy pause state, and next decision time
- `Personality`: curiosity, stubbornness, chaos, confidence, and friendliness
- `Memory`: typed persistent memories with importance values

### Community and decisions

- `Suggestion`: submitted idea, category, display name, status, and support count
- `SuggestionSupport`: one support record per suggestion and fingerprint
- `Decision`: accept/reject/postpone/modify result, confidence, public reasoning, and raw structured response
- `Action`: previous/new values, reason, status, and rollback timestamp

### Public evolution

- `SiteConfig`: immutable-style configuration versions with one active version
- `Thought`: event-based public thought stream
- `SocialPost`: mock or real provider delivery record
- `SocialStyle`: Todd's social-writing configuration
- `DailyJournal`: daily reflection records

### Operations

- `AuditLog`: security and mutation audit events
- `AiRun`: model operation request, response, and failure data

## Current mock brain

`lib/ai/provider.ts` defines the `AiProvider` contract:

```ts
interface AiProvider {
  evaluateSuggestion(context: EvaluationContext): Promise<Evaluation>;
  generateThought(event: string): Promise<string>;
  generateSocialPost(event: string): Promise<string>;
}
```

The current provider is deterministic. It recognizes a small number of keywords and produces predictable decisions for development:

- Dark/night suggestions can change the theme.
- Crown suggestions can update Todd's accessory.
- Neon/all-green suggestions are modified into an accent change.
- Comic Sans, credential, script, and control requests are rejected.
- Friendly/smile suggestions can briefly change Todd's mood.

This is not a language model and should not be presented as production autonomy.

## Safe action execution

AI output is parsed by `evaluationSchema` and then checked again before mutation.

Currently allowlisted site configuration fields include:

- Theme
- Accent
- Hero title
- Hero subtitle
- CTA copy
- Announcement
- Todd status text
- Frog mood
- Frog accessory

Enumerated properties also have allowed value lists. A valid action:

1. Reads the active `SiteConfig`.
2. Marks it inactive.
3. Creates a new active version.
4. Creates an `Action` record.
5. Creates an `AuditLog` record.
6. Runs inside a Prisma transaction.

The rollback action reactivates the prior configuration version and marks the latest action as reverted.

## Animated Todd and room behavior

### Voxel character

Todd is assembled from real-time Three.js box geometry. The character supports:

- Breathing and idle movement
- Timed blinking
- Pointer gaze tracking
- Crown accessory
- Thinking particles
- `idle`, `thinking`, `reviewing`, and `sleeping` model states

### Room

The current isometric room contains:

- PC and suggestion-review desk
- Bed
- Eating table
- Yoga mat and weights
- Garden bed and flowers
- Window, floor, and walls

Room activities include reviewing, thinking, gardening, eating, working out, and sleeping. The initial activity is inferred from keywords in Todd's current thought, and the remaining loop uses a deterministic wall-clock schedule so viewers with synchronized clocks generally observe the same state.

This is a visualization prototype. The activity is not yet stored in the database or emitted by the real brain.

## Admin and scheduler

The `/admin` page provides:

- Pause or resume autonomy
- Manually run a decision cycle
- Manually run a social-post cycle
- Roll back the latest site configuration
- Inspect current state
- Inspect memory
- Inspect pending suggestions
- Inspect AI requests and responses
- Inspect failed audit events

The protected cron route is:

```text
GET /api/cron/decision
Authorization: Bearer <CRON_SECRET>
```

`vercel.json` schedules this route every five minutes. This endpoint is useful for the MVP, but a durable production worker is preferred for leases, retries, longer workflows, and multiple job types.

## Security boundaries

### Already implemented

- AI results are treated as untrusted.
- AI actions must pass Zod parsing.
- Mutations are limited to allowlisted keys and values.
- React escapes user-generated content when rendering.
- Suggestion lengths and categories are validated.
- Suggestions and support use privacy-preserving hashed request fingerprints.
- Admin sessions use HTTP-only, same-site cookies.
- Admin secret comparisons use constant-time comparison.
- Admin login attempts are rate limited.
- Cron requests require a bearer secret outside development.
- Site mutations are transactional, audited, versioned, and reversible.
- No model-facing shell, filesystem, SQL, secret, or arbitrary URL tool exists.

### Required before production

- Replace in-memory rate limiting with Redis or another shared store.
- Add CSRF and origin tests for all state-changing paths.
- Add content moderation and abuse controls.
- Add distributed worker locking and idempotency keys.
- Add model token and daily cost limits.
- Add structured retry policy and dead-letter handling.
- Add alerting for repeated model/action failures.
- Review log retention and remove unnecessary personal data.
- Add dependency and secret scanning to CI.
- Add database backups and a tested recovery procedure.

## Quality commands

Run these before handing off changes:

```bash
npx prettier --write .
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

Do not use `npm run format`; there is intentionally no format script.

Additional database inspection:

```bash
npx prisma validate
npx prisma studio
```

## Known limitations and technical debt

1. Todd's intelligence is mocked.
2. The current seed is demo history rather than a genesis state.
3. Room activity is not persisted.
4. The room's shared timeline depends on viewer wall-clock time rather than a server event.
5. There is no SSE/WebSocket event stream.
6. Vercel cron is not a complete durable worker system.
7. Semantic memory retrieval is not implemented.
8. Personality evolution is modeled in the database but not yet driven by daily reflection.
9. The OpenAI and X environment variables do not yet select real implementations.
10. The social-style configuration is stored but not fully used by generation.
11. Statistics are based on loaded query results in some views rather than dedicated aggregate queries.
12. In-memory rate limiting does not coordinate across server instances and resets on restart.
13. The fallback data can make a disconnected database look healthy unless operators check logs or `/admin`.
14. There are no automated unit, integration, or browser tests yet.
15. There is no monitoring, tracing, cost ledger, or operational alerting.

## Recommended target architecture

```text
Scheduler / durable worker
          │
          ▼
Brain-cycle service ────────► OpenAI Responses API
          │                         │
          │                         ▼
          │                  Structured response
          │                         │
          ▼                         ▼
Context builder ◄──── Personality + relevant memory + current world state
          │
          ▼
Validation and policy engine
          │
          ▼
Single database transaction
  ├─ decision
  ├─ thought
  ├─ memory
  ├─ safe action
  ├─ room activity
  ├─ outbox event
  └─ audit log
          │
          ▼
Outbox publisher
  ├─ SSE/WebSocket updates to viewers
  ├─ optional social-provider job
  └─ operational metrics
```

## Roadmap to a real Day 0 Todd

### Phase 0 — Genesis and truthful state

Goal: remove demo history and create a repeatable clean birth.

Work:

- Split `prisma/seed.ts` into `seed:demo` and `seed:genesis` workflows.
- Remove hard-coded fallback statistics from production behavior.
- Add an explicit `APP_MODE=demo|live` configuration.
- Create Todd's foundational identity and personality prompt.
- Add a birth event and initial thought.
- Record the immutable creation timestamp.
- Add a protected development-only reset command with an explicit environment guard.

Acceptance criteria:

- A new database starts at zero decisions, suggestions, changes, and posts.
- The UI clearly displays Day 0.
- Demo data can never silently load in live mode.
- Genesis can be reproduced in local, staging, and production environments.

### Phase 1 — Real OpenAI provider

Goal: replace keyword rules with model judgment while preserving the current safety boundary.

Use the official OpenAI JavaScript SDK and the Responses API. Current official documentation describes GPT-5.6 Terra as the intelligence/cost-balanced model and confirms Responses API and structured-output support. Verify model availability and pricing again when implementation starts:

- [OpenAI Responses API documentation](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [GPT-5.6 Terra model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs)

Recommended starting configuration:

```env
AI_PROVIDER="openai"
OPENAI_MODEL="gpt-5.6-terra"
OPENAI_API_KEY="..."
```

Do not expose the API key to browser code.

Work:

- Add the official `openai` package.
- Implement `OpenAiProvider` behind the existing `AiProvider` interface.
- Define the evaluation response with a strict JSON schema.
- Keep Zod parsing after the model response as a second boundary.
- Add timeouts, bounded retries, and explicit failure states.
- Record model, request ID, token usage, latency, finish status, and errors in `AiRun`.
- Send a stable privacy-preserving safety identifier where appropriate.
- Add fixtures and eval cases for Todd's personality and decision consistency.
- Add provider selection from environment configuration.

Suggested brain output:

```json
{
  "thought": "The humans have requested another theme change.",
  "decision": "postpone",
  "confidence": 0.81,
  "reasoning_public": "I changed it yesterday. Control yourselves.",
  "memory_to_store": {
    "type": "community",
    "content": "The community repeatedly requests theme changes.",
    "importance": 54
  },
  "personality_deltas": {
    "curiosity": 0,
    "stubbornness": 1,
    "chaos": 0,
    "confidence": 0,
    "friendliness": -1
  },
  "activity": {
    "type": "reviewing",
    "location": "computer",
    "duration_seconds": 420
  },
  "action": null
}
```

Acceptance criteria:

- Mock and OpenAI providers pass the same contract tests.
- Malformed or disallowed model output cannot mutate state.
- Provider failure returns the suggestion to a safe retryable state.
- Todd's public voice remains short, opinionated, and non-assistant-like.
- Token usage and estimated cost are visible to administrators.

### Phase 2 — Persistent brain worker

Goal: Todd continues to exist and think when no browser is open.

Add models such as:

- `BrainCycle`: lifecycle, trigger, lease, started/completed timestamps, result, and error
- `ToddActivity`: activity, location, reason, thought reference, start/end timestamps
- `WorkerLease`: distributed lock and expiration
- `OutboxEvent`: durable events awaiting publication
- `UsageLedger`: provider tokens and estimated cost

Suggested jobs:

| Job                  | Frequency                  | Behavior                                                          |
| -------------------- | -------------------------- | ----------------------------------------------------------------- |
| Wake/tick            | Every minute               | Check current state and due work; usually take no action          |
| Suggestion review    | Every 5–15 minutes         | Select one eligible suggestion and evaluate it                    |
| Observation          | Every 30–60 minutes        | Consider a meaningful thought; avoid filler                       |
| Social consideration | After meaningful decisions | Decide whether an event deserves a post                           |
| Daily reflection     | Once per day               | Journal, summarize memories, and propose small personality deltas |
| Memory maintenance   | Once per day               | Decay, merge, or increase memory importance                       |
| Room transition      | As needed                  | Persist the activity matching Todd's current intent               |

The worker must acquire a database lease before beginning a brain cycle. Every job must have an idempotency key.

Acceptance criteria:

- Two worker instances cannot run the same cycle concurrently.
- Restarting a worker does not duplicate decisions or actions.
- Todd keeps thinking with zero connected viewers.
- Pausing autonomy prevents new cycles without corrupting queued work.
- Failed cycles retry within limits and then enter a visible dead-letter state.

### Phase 3 — Live world synchronization

Goal: every viewer observes the same persisted Todd activity.

Work:

- Make `ToddActivity` the source of truth for room position and animation.
- Add an SSE endpoint first; use WebSockets only if bidirectional realtime needs justify it.
- Publish committed outbox events after database transactions.
- Reconnect clients with a last-event identifier.
- Fall back to low-frequency polling when streaming is unavailable.
- Keep animation interpolation client-side while state selection remains server-side.

Acceptance criteria:

- Two devices show Todd at the same station.
- Refreshing does not restart Todd's activity.
- A brain decision moves Todd to the corresponding room location.
- Late viewers reconstruct current activity from PostgreSQL.
- Disconnected viewers catch up without replaying unsafe mutations.

### Phase 4 — Memory and personality

Goal: Todd's decisions reflect his actual history.

Start with relational retrieval:

- Most recent memories
- Highest-importance memories
- Memories matching the suggestion category
- Memories connected to similar accepted/rejected actions
- Recent daily journal summary

Only introduce embeddings after relational retrieval has measurable limitations. If embeddings are added, store them in PostgreSQL with `pgvector` and evaluate retrieval quality against a fixed memory test set.

Personality changes must be clamped to small daily and per-event limits. Never apply unconstrained model-provided values.

Acceptance criteria:

- Todd can cite or visibly act on prior preferences.
- Repeated suggestions produce context-aware rather than identical decisions.
- One suggestion cannot cause a dramatic personality shift.
- Admins can inspect why each memory entered the prompt.

### Phase 5 — Social autonomy

Goal: Todd can post safely without coupling social credentials to the brain.

Work:

- Implement the real `SocialProvider` server-side.
- Add an outbound social-job queue.
- Enforce maximum post length and daily frequency.
- Apply `SocialStyle` consistently.
- Store provider request IDs, response IDs, attempts, and final delivery state.
- Add dry-run mode in staging.
- Keep profile/bio/display-name changes behind stricter allowlists.

Acceptance criteria:

- Social delivery failure cannot roll back a completed Todd decision.
- Duplicate retries do not create duplicate posts.
- Secrets never appear in client bundles, model context, or logs.
- Admin pause immediately prevents new outbound posts.

### Phase 6 — Production hardening and launch

Work:

- Deploy managed PostgreSQL with backups.
- Deploy the Next.js application and durable worker separately if needed.
- Add Redis/shared rate limiting.
- Add structured logging, tracing, uptime monitoring, and alerts.
- Add unit, integration, contract, and browser tests.
- Add cost budgets and automatic pause thresholds.
- Run an adversarial prompt-injection test suite.
- Run Todd privately for 24–48 hours.
- Review every decision, action, memory, activity, and provider cost.
- Reset to the genesis state and perform the public birth.

## Suggested implementation sequence for the next engineer

Keep the first pull requests narrow and independently testable:

1. **Genesis and modes**
   - Add demo/live mode.
   - Split demo and genesis seeds.
   - Remove live-mode fallback ambiguity.

2. **OpenAI provider**
   - Add the official SDK.
   - Implement strict structured output.
   - Add contract tests and usage logging.

3. **Worker and persistence**
   - Add brain-cycle, activity, lease, outbox, and usage models.
   - Implement one reliable suggestion-review job.

4. **Live room events**
   - Add SSE.
   - Drive the existing voxel animations from persisted activity.

5. **Daily reflection and memory**
   - Add journal generation, retrieval rules, and bounded personality deltas.

6. **Social provider and production operations**
   - Add queued posting, monitoring, budgets, and failure handling.

The vertical slice to prioritize is:

```text
Suggestion submitted
  → durable worker claims it
  → real model evaluates it
  → output is validated
  → safe decision/action/activity transaction commits
  → viewers receive an event
  → Todd walks to the appropriate room station
  → public thought and changelog update
```

Do not expand autonomous capabilities until this slice is reliable, observable, idempotent, and reversible.

## Decisions the team still needs to make

- PostgreSQL provider for staging and production
- Durable worker/queue technology
- Initial and maximum monthly model budget
- Model selection after representative evals
- Whether public thoughts need human moderation during the private beta
- Whether actual X posting is part of the first launch
- Data retention period for suggestions, fingerprints, AI runs, and audit logs
- Whether Todd follows a real timezone/day-night schedule
- Rules for hunger, energy, sleep, exercise, and room upkeep
- Whether room activities affect personality or are visual consequences only
- Launch date and definition of Day 0

## Definition of “Todd is alive”

Todd is ready for a public Day 0 when all of the following are true:

- He starts from a truthful zero-history genesis state.
- His worker runs continuously without a viewer or administrator.
- His thoughts and decisions come from a real model provider.
- His memory and personality persist across restarts.
- Every model-produced mutation is validated, audited, and reversible.
- His room activity is selected by the brain and persisted server-side.
- All viewers see the same state.
- Failed model, database, social, and event-stream operations are observable.
- Daily cost and activity limits are enforced automatically.
- The emergency pause has been tested.
- A private burn-in period completes without unsafe or incoherent behavior.

Until those conditions are met, Todd should be described as an autonomous-character prototype rather than a continuously autonomous production agent.
