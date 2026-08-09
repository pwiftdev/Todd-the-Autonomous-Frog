# Todd — The Autonomous Frog

Todd is an autonomous AI frog whose personality, memories, website, public behavior, and voxel world evolve over time.

The product principle is simple:

> People suggest. Todd decides. Todd evolves.

Todd is influenced by the community, but he is not governed by it. Community support is one signal in his decision process—not a vote that automatically controls him.

This document is the engineering handoff for the current MVP. It explains what exists, what is simulated, how to run the project, the important safety boundaries, and the recommended path from the current prototype to a persistent autonomous Todd starting from Day 0.

## Project status

Last updated: August 10, 2026

The application has a polished public prototype plus a durable backend brain. A real OpenAI provider and leased PostgreSQL worker are implemented, but they are not live until production credentials, model, database migrations, and cron delivery are configured and verified.

| Area                        | Status                 | Notes                                                                                        |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| Public homepage             | Implemented            | Responsive editorial/swamp design with explicit demo/live provenance                         |
| Animated Todd               | Implemented            | Real-time voxel geometry rendered with React Three Fiber                                     |
| Todd's house                | Implemented            | Interactive two-story voxel house, grounds, 12 spaces, and 96 activity contracts             |
| Suggestions                 | Implemented            | Submission, categories, support counts, statuses, and public feed                            |
| Suggestion rate limiting    | Implemented            | Atomic PostgreSQL-backed limits coordinate across application instances                      |
| Personality                 | Implemented            | Numeric persistent traits in Prisma with seeded defaults                                     |
| Memory                      | Data layer implemented | Relational memory model exists; semantic retrieval is not implemented                        |
| Thoughts                    | Implemented            | Seeded in demo or persisted from the configured provider's decision cycle                    |
| Decisions                   | Implemented            | Structured decision records and public reasoning                                             |
| Safe site changes           | Implemented            | Zod validation, key/value allowlist, versioned config, audit log, rollback                   |
| AI provider abstraction     | Implemented            | Dependency-injected, schema-validated OpenAI and deterministic mock providers                 |
| Real OpenAI provider        | Implemented, off by default | Responses API, strict output, timeout, idempotency and usage metadata; live credentials/model still require deployment configuration |
| Scheduler endpoint          | Implemented            | Protected enqueue and durable leased-worker routes with idempotency, retries, and fencing     |
| Social delivery             | Intentionally disabled | Durable outbox intent exists; no external consumer is enabled                                 |
| Real X integration          | Not implemented        | Credentials, OAuth/API integration, delivery tracking, and policy controls required          |
| Admin panel                 | Implemented            | Pause/resume, manual cycles, inspection, rollback, and failure visibility                    |
| Clean Day 0 birth           | Not implemented        | Current seed and no-database fallback contain realistic fake history                         |
| Live house state            | Simulated              | Viewers follow a deterministic wall-clock loop; brain-selected activity is not yet persisted |
| Live event transport        | Not implemented        | Add Server-Sent Events or WebSockets for real cross-viewer state updates                     |
| Production deployment       | Not completed          | Docker development database and Vercel cron configuration are included                       |

## Important current-state warning

The application can render without a configured database by using `lib/default-data.ts`. Every consuming surface labels this content as synthetic demo data; it is not persistent. Suggestions, decisions, memories, and configuration changes require PostgreSQL.

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
- React Three Drei camera controls
- Code-native voxel geometry; no static Todd image
- Shared voxel geometry and viewport-aware rendering to limit GPU work

### Data and backend

- PostgreSQL
- Prisma ORM
- Next.js server actions
- Next.js route handlers
- Versioned database-backed site configuration

### External providers

- `AiProvider` abstraction with OpenAI Responses API and deterministic mock implementations
- Social delivery is disabled; approved intent can be stored in the durable outbox only
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
  todd-house.tsx              Two-story house, grounds, furniture, and active-room effects
  todd-room.tsx               World canvas, Todd movement, camera, simulation, and live HUD
  todd-frog.tsx               Public wrapper for the voxel character
  suggestion-form.tsx         Suggestion input UX
  suggestion-card.tsx         Suggestion status and support UI
  site-header.tsx             Shared navigation
  page-frame.tsx              Shared secondary-page layout
  footer.tsx                  Shared footer

lib/
  todd-world.ts               Brain-to-world activity contracts, anchors, needs, and catalog
  todd-world-navigation.ts    Collision volumes, visibility routes, and multi-floor stairs
  ai/provider.ts              OpenAI Responses API and deterministic mock provider
  social/provider.ts          Legacy adapter; external delivery remains disabled
  autonomy.ts                 Durable enqueue/worker/state application adapter
  validation.ts               Suggestion and AI-output schemas
  data.ts                     Public data queries and fallback selection
  default-data.ts             Non-persistent demo content
  prisma.ts                   Prisma client singleton
  admin-auth.ts               Admin secret verification
  security/rate-limit.ts      Atomic PostgreSQL-backed shared limiter

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
| `FINGERPRINT_SECRET` | HMAC key for privacy-preserving request identity | Required in live |
| `PUBLIC_ORIGIN`   | Exact allowed mutation origin including scheme | Required in live |
| `CLIENT_IP_HEADER` | Ingress-owned client-address header       | Required in live                   |
| `AI_PROVIDER`     | `mock` in demo/test; `openai` in live      | Yes                                |
| `SOCIAL_PROVIDER` | Must remain `disabled`                     | Yes                                |
| `OPENAI_API_KEY`  | Server-side OpenAI credential              | Required in live                   |
| `OPENAI_MODEL`    | Explicit Responses API model               | Required in live                   |
| `X_API_KEY`       | Reserved for a real X provider            | Not used yet                       |
| `X_API_SECRET`    | Reserved for a real X provider            | Not used yet                       |

Future production controls may add explicit daily cost limits and event-stream configuration. Worker identity and retry policy are generated and persisted by the durable worker.

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
  ├─ Signed admin authentication and exact-origin mutation checks
  ├─ OpenAI Responses API plus deterministic mock provider
  ├─ Strict Zod/provider policy validation
  ├─ Safe reversible action allowlist and disabled social outbox
  └─ Protected enqueue and leased worker cron routes
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
- `SocialPost`: seeded public-post record; external delivery is disabled
- `SocialStyle`: Todd's social-writing configuration
- `DailyJournal`: daily reflection records

### Operations

- `AuditLog`: security and mutation audit events
- `AiRun`: model operation request, response, and failure data

## Current AI brain

`lib/ai/provider.ts` defines the `AiProvider` contract:

```ts
interface AiProvider {
  readonly providerName: "mock" | "openai";
  readonly modelName: string;
  evaluateSuggestion(context: EvaluationContext): Promise<Evaluation>;
}
```

The deterministic mock provider recognizes a small number of keywords and produces predictable decisions in demo/test:

- Dark/night suggestions can change the theme.
- Crown suggestions can update Todd's accessory.
- Neon/all-green suggestions are modified into an accent change.
- Comic Sans, credential, script, and control requests are rejected.
- Friendly/smile suggestions can briefly change Todd's mood.

Live mode instead requires the OpenAI Responses API provider, an explicit model, strict structured output, and persistent PostgreSQL. The implementation is not production autonomy until those dependencies are configured, migrated, deployed, and exercised.

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
- Oversized head with a narrow torso, articulated arms, legs, feet, and toes
- Counter-swinging limbs, lifted feet, torso sway, and walking bounce
- Thinking particles
- `idle`, `thinking`, `reviewing`, and `sleeping` model states

### House and world

Todd now lives in an interactive, orbitable two-story voxel house with day/night lighting. Its 12 spaces are a suggestion porch, office, kitchen, thinking lounge, bathroom, bedroom, gym, memory archive, workshop, greenhouse, pond courtyard, and rooftop observatory. Each space has purpose-built furniture, active-object lighting, and a safe destination anchor.

The world catalog defines 96 unique activities. Every activity has a stable ID, room destination, animation family, activators, duration range, cooldown, interruptibility policy, and need effects. The future brain can choose one directly by passing its ID as `requestedActivityId` to `ToddRoom`; until that state is persisted, the public demo infers a starting action from Todd's thought and runs a deterministic shared loop.

Todd keeps a persistent world transform and walks continuously between destinations instead of respawning. A visibility-graph router plans around inflated wall and furniture collision volumes using Todd's rendered body radius. Vertical support positions are derived from his lowest animated foot so his body stays above floors and steps. Floor changes traverse each visible stair step, water entry is handled as a separate vertical transition, and new decisions wait until the current route finishes. The navigation test matrix validates every room-to-room pairing.

At the destination, Todd turns toward the station and changes pose for sleeping, working, reading, thinking, eating, swimming, exercising, dancing, hiding, and other action families. Viewers can orbit, zoom, and enter fullscreen while the HUD exposes whether he is traveling or acting, his room, thought, activators, needs, and upcoming schedule.

The house is ready as a visualization and activity-selection surface. The activity is not yet stored in the database or emitted by the real brain.

## Admin and scheduler

The `/admin` page provides:

- Pause or resume autonomy
- Durably enqueue a decision cycle
- Roll back the latest site configuration
- Inspect current operational state and active configuration

The protected cron routes are:

```text
GET /api/cron/decision
GET /api/cron/worker
Authorization: Bearer *** cron token]
```

`vercel.json` enqueues every five minutes and invokes the worker every minute. Runs, leases, retries, fencing tokens, and terminal outcomes survive individual serverless invocations in PostgreSQL.

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

- Add content moderation and abuse controls.
- Add model token and daily cost limits.
- Add alerting for repeated model/action failures.
- Review log retention and remove unnecessary personal data.
- Add dedicated secret scanning to CI.
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

1. The real provider and durable worker are implemented but not configured or deployed in production.
2. The current seed is demo history rather than a genesis state.
3. Room activity is not persisted.
4. The room's shared timeline depends on viewer wall-clock time rather than a server event.
5. There is no SSE/WebSocket event stream.
6. Vercel cron invocations are bounded; durable queue/lease/retry state remains in PostgreSQL between invocations.
7. Semantic memory retrieval is not implemented.
8. Personality evolution is modeled in the database but not yet driven by daily reflection.
9. OpenAI is implemented but requires explicit live credentials/model; external X delivery remains disabled.
10. The social-style configuration is stored but not fully used by generation.
11. Statistics are based on loaded query results in some views rather than dedicated aggregate queries.
12. Shared rate limiting is PostgreSQL-backed; very high-volume deployments may still move it to Redis.
13. Demo fixtures are explicitly marked synthetic; live mode fails closed instead of falling back.
14. Unit and real-PostgreSQL integration tests run in CI; full browser coverage is still incomplete.
15. Provider usage/cost metadata is stored, but production monitoring, tracing, and alert delivery still require deployment configuration.

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

## Remaining roadmap to a real Day 0 Todd

### Delivered locally on `brain/backend`

- Explicit `demo`, `test`, and fail-closed `live` runtime modes.
- OpenAI Responses API and deterministic mock providers behind one strict contract.
- Durable PostgreSQL decision runs with idempotent enqueue, atomic claims, leases, fencing, retries, terminal recovery, and provider-attempt metadata.
- Schema and policy validation before reversible allowlisted configuration changes.
- Persisted decisions, thoughts, memories, personality effects, activities, outbox intent, configuration lineage, and public brain state.
- Signed admin sessions, exact-origin mutation checks, ingress-owned client identity, and shared PostgreSQL rate limiting.
- Dataful migration rehearsal, real-PostgreSQL concurrency tests, CI, health contracts, and explicit demo-data provenance.

These capabilities are implemented and locally verified; they are not production-deployed or continuously running yet.

### Required before production launch

- Replace the demo seed with a reproducible genesis seed containing zero fabricated history and one explicit birth event.
- Provision managed PostgreSQL with backups and a tested restore procedure.
- Configure live runtime secrets, exact public origin, trusted ingress header, OpenAI credentials, and an explicitly selected model.
- Apply migrations as a release step, then prove one controlled suggestion-to-decision cycle and duplicate-delivery behavior.
- Establish representative model evaluations, token/daily cost limits, moderation policy, monitoring, alerting, and a documented retention policy.
- Run Todd privately for 24–48 hours, inspect every decision/action/cost, then reset deliberately to the genesis state before public birth.
- Keep external social delivery disabled unless a separately reviewed outbox consumer has moderation, budgets, dry-run support, idempotent reconciliation, and an emergency pause.
- Coordinate any persisted room activity or live event transport with the collaborator-owned 3D/world subsystem rather than implementing it in the backend stream.

### Proven backend vertical slice

```text
Visitor suggestion submission
  → shared validation and PostgreSQL rate limit
  → durable idempotent enqueue
  → leased worker claims with fencing
  → configured provider evaluates strict structured context
  → policy validation
  → decision, thought, memory/personality effects and safe action commit atomically
  → sanitized public brain state publishes the result
```

This slice is covered with deterministic providers and disposable PostgreSQL. Paid production-provider and external-social calls are intentionally absent from tests.

## Decisions the team still needs to make

- Managed PostgreSQL provider and backup/restore service levels.
- Initial and maximum monthly model budget, plus automatic pause thresholds.
- Exact production model after representative evaluations.
- Whether public thoughts require human moderation during private beta.
- Whether actual X posting belongs in the first public launch.
- Data retention periods for suggestions, request fingerprints, AI payloads, and audit logs.
- Whether Todd follows a real timezone/day-night schedule.
- Rules for hunger, energy, sleep, exercise, and room upkeep.
- Whether room activities affect personality or remain visual consequences only.
- Launch date and exact definition of Day 0.

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