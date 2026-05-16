# Investment Research Intelligence

A B2B investment research intelligence product concept: a secure research notes workspace that extracts investment claims, detects contradictions/agreements across analysts' notes, synthesizes industry assessments, and monitors news flow for corroborating or contradicting evidence.

## Core Idea

Investment teams produce valuable private research in meeting notes, expert calls, channel checks, earnings notes, and internal discussions. That knowledge is usually fragmented across documents, chat, CRM/RMS systems, and individual notebooks.

This product turns those notes into a **permission-aware temporal claim graph**:

- What do we believe?
- Who said it?
- What evidence supports it?
- What contradicts it right now?
- What was true historically but has since reversed or gone stale?
- Which teammates should know?
- What has news flow changed?

## Target Users

- Portfolio managers and CIOs.
- Senior and junior analysts.
- Research heads.
- Compliance/COO teams at investment firms.

Initial ICP: research-intensive public-market investment teams such as long/short equity funds, long-only fundamental teams, family offices, and crossover investors.

## Key Product Capabilities

- Secure research note capture and import.
- Entity extraction for companies, tickers, sectors, products, people, KPIs, and themes.
- Structured investment claim extraction with source citations and temporal windows (`observedAt`, applies-to start/end, horizon, freshness).
- Temporal relation detection across teammates' notes: true contradictions, tensions, trend reversals, corroboration, and stale evidence.
- Company and industry/theme synthesis that separates current view from historical evidence.
- News and filings monitoring against internal claims.
- Permission-aware search and Q&A.
- In-app, Slack/Teams, and email notification strategy.
- Audit logs, RBAC, retention controls, and AI data privacy posture for investment teams.

## Documents

- [`AGENT_CONTEXT.md`](./AGENT_CONTEXT.md) — live orientation doc for agents; read this first before changing product, UX, engine, roadmap, or docs.
- [`LIVE_ROADMAP.md`](./LIVE_ROADMAP.md) — active build roadmap reflecting current repo state, next priorities, and definition of done.
- [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — detailed product specification covering positioning, personas, workflows, MVP, features, architecture, data model, AI pipeline, integrations, security/compliance, notifications, risks, open questions, and launch plan.
- [`ROADMAP.md`](./ROADMAP.md) — original phased roadmap from discovery through private alpha, contradiction detection, synthesis, news integration, enterprise readiness, and GA.
- [`MVP_PLAN.md`](./MVP_PLAN.md) — concise implementation plan and validation approach for the current MVP.

## MVP Thesis

The MVP should prove that a small investment team can upload or write research notes, get accurate extracted claims with citations, and receive useful low-noise alerts when new notes agree with or contradict prior internal research.

The highest-leverage first loop is:

1. Capture/import note.
2. Extract entities and claims.
3. Analyst reviews claims.
4. Compare against accessible prior claims.
5. Surface high-confidence temporal relations: overlapping contradictions, non-overlapping reversals, corroboration, and stale evidence.
6. Notify relevant teammates.
7. Update company/theme synthesis.

## Non-Goals

- Not a trading signal generator.
- Not a Bloomberg/FactSet replacement.
- Not a generic notes app.
- Not an automated compliance or MNPI determination tool.

It is decision-support infrastructure for organizing evidence and surfacing disagreement; humans remain responsible for investment decisions and compliance judgments.

## Working MVP App

This repo now includes a production-shaped Mycelium foundation for the investment research intelligence product.

### What it demonstrates

- Calm research-capture workspace with editable note titles, Notes-only pasted meeting-note/transcript import that previews parsed fields before applying them to the unsaved workbench, display-mode markdown editing, formatting toolbar, slash-command formatting palette, undo/redo controls, explicit blank-note action, selected-note save mode, and keyboard-friendly `Cmd/Ctrl + Enter` note intake.
- Left-rail page navigation separates clean current-note Notes, scoped Dashboard, relationship map, full-width note archive, and Organisation admin so each surface has its own workspace.
- Notes only shows the active note, live extraction, and saved claims/relations tied to the selected note; workspace/team/org pulse, signals, top metadata, and source-person coverage live on Dashboard.
- Action-backed empty states for no notes, filtered results, empty graph subjects, missing current-note claims, missing relations, and source-person history.
- Collapsible all-notes sidebar with collapsible search/filter controls, non-stretching dense one-line title/date rows, click-to-load note behavior, plus search, sort, date, stock/ticker, industry/theme, KPI, watchlist, participant, location, and team filters.
- Normalized note metadata for observed date, Personal/Team/Organisation location and access scope, active team selection for team-scoped notes, stocks/securities, industries/sectors, themes, KPIs, watchlists, and participants, persisted through the BFF and Supabase. A local deterministic ontology canonicalizes the demo issuer/security aliases, derives parent sectors for known industries, and derives default demo watchlists from known securities. Legacy stock/theme/KPI arrays and legacy visibility imports remain as compatibility fields. Applies-to windows and horizon are inferred for extracted claims and edited during claim review rather than entered on the note form.
- Server-backed recoverable workbench drafts, explicit saved-note editing, author-only note update enforcement, and read-only note revision history.
- Supabase Auth-backed sign-in/sign-up flow where the first organization user becomes org admin and later same-domain signups require pending invites.
- Supabase Postgres schema, raw migrations, RLS policies, and audit/event tables for a production path from day one.
- Fastify backend-for-frontend that serves `/api/*`, materializes the temporal claim graph, exposes scoped dashboard aggregates through `/api/dashboard`, returns historical graph projections through `/api/workspace?asOf=YYYY-MM-DD`, provides organization admin lifecycle routes, and can serve the built React app as one deployable Node service.
- Authenticated workspace JSON export/import routes for demo restore workflows, including dismissed relation review decisions.
- Deterministic local extraction of companies, tickers, industries, themes, KPIs, and claims with ontology-backed aliases, live preview, and addable metadata suggestions.
- Claim direction classification with citation snippets, approve/reject/edit review state, analyst review notes, participant correction, and persisted relation review controls.
- Temporal relationship detection across accessible notes, with dates, source-person context, extraction confidence, and relation evidence strength explaining why an opposing read is a true contradiction vs a trend reversal.
- Server-side permission filtering for Analyst, PM, Compliance, org admin management rights, active/deactivated member status, multi-team membership, and author-only personal notes.
- Scoped dashboard views with workspace/team/org toggles, 30-day/90-day/all-time ranges, metric cards, relation mix, freshness, review backlog, signals, top companies/themes/KPIs/securities/watchlists/source people, and source-person coverage.
- Relationship-map affordance for a temporal claim graph with red contradictions, amber tensions, blue reversals, green corroboration, grey stale evidence, server-backed as-of timeline, current/historical lanes, author/team/metadata filters, density controls, and a selected-relation detail drawer.
- In-app alerts for contradictions, tensions, reversals, corroboration clusters, stale evidence, and research-density changes.
- Permission-aware note archive and seed demo data so the app is useful immediately.

### Stack

- Vite
- React
- TypeScript
- React Markdown with sanitized markdown/HTML rendering
- Fastify
- Supabase Auth/Postgres/RLS/Storage-ready local project
- Local heuristic intelligence engine (`src/engine.ts`)
- No paid APIs, secrets, or hosted model calls required

### Setup

```bash
npm install
```

### Configure Supabase

Install/start Docker Desktop, then run:

```bash
npm run supabase:start
```

Create a local `.env` with the values printed by Supabase:

```bash
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MYCELIUM_ORG_SEED_DOMAIN=example.test
PORT=5174
```

The local Supabase config uses `55321`-series host ports instead of the default `5432x` range to avoid Windows/Docker reserved-port conflicts.

The migration in `supabase/migrations/202605060001_production_foundation.sql` creates organizations, profiles, teams, notes with stock/theme/KPI metadata arrays, claims, relations, audit events, extraction jobs, auth bootstrap triggers, and RLS policies. The follow-up `supabase/migrations/202605090001_note_persistence_spine.sql` migration adds note drafts, note revision history, and author-only note update RLS. `supabase/migrations/202605090002_normalized_research_entities.sql` adds normalized research entities, note/claim entity links, linked-entity draft/history storage, access-following RLS policies, and indexes. `supabase/migrations/202605100001_organization_admin_structure.sql` adds org admin/member status, active/archived teams, pending invites, nullable team links for personal/organization notes, and canonical note/claim access scopes.

### Run locally

```bash
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. Vite proxies `/api` to the Fastify BFF on `http://localhost:5174`.

### Production-style run

```bash
npm run build
npm start
```

This serves the built React assets from the Fastify Node service and exposes `/api/*` from the same process.

### Validate

```bash
npm run validate
```

This runs a production build/typecheck and the full deterministic test suite.

### Useful files

- `src/note-import.ts` - pure parser for pasted meeting notes and transcripts, including header extraction, transcript cleanup, conservative date handling, participant detection, and linked metadata normalization.
- `src/ontology.ts` - local deterministic issuer/security/industry/watchlist ontology for canonical aliases, parent sectors, default demo watchlists, and issuer-aware relation matching.
- `src/entity-links.ts` - shared normalized entity/link helpers, ontology-backed canonicalization, derived metadata arrays, and legacy metadata-array compatibility.

- `MVP_PLAN.md` — concise implementation plan and validation approach.
- `src/engine.ts` — deterministic extraction, confidence scoring, temporal relation detection, synthesis, and alerts.
- `server/workspace-service.ts` — server-side graph materialization, permission-filtered workspace snapshots, Personal/Team/Organisation access scopes, multi-team membership, organization admin lifecycle, role-gated dashboard aggregation, workspace JSON export/import, note editing/history/drafts, claim/relation review behavior, and extraction provider boundary.
- `server/app.ts` — Fastify BFF routes for workspace, scoped dashboard aggregates, organization admin lifecycle, workspace export/import, notes, note draft recovery, note history, claim review, relation review, audit events, and auth bootstrap.
- `server/supabase-repository.ts` — Supabase repository adapter used by the BFF.
- `supabase/migrations/202605060001_production_foundation.sql`, `supabase/migrations/202605090001_note_persistence_spine.sql`, `supabase/migrations/202605090002_normalized_research_entities.sql`, and `supabase/migrations/202605100001_organization_admin_structure.sql` — production-shaped Postgres schema, persistence spine tables, normalized entity links, organization administration, access scopes, and RLS policies.
- `src/main.tsx` — Supabase Auth-backed workspace UI: capture, selected-note save mode, server draft recovery, note history drawer, observed/location controls, active team selection, organization admin page, stock/theme/KPI metadata, action-backed empty states, notes sidebar, page-level notes/dashboard/map/archive/admin navigation, slash-command markdown editing, live extraction, current-note claim/relation review, dashboard metrics/charts/signals/source-person coverage, relationship map as-of timeline/lanes/filters/density/review/detail drawer, and archive.
- `src/demo-guide.ts` and `src/empty-states.ts` — pure frontend guidance helpers for walkthrough content/storage and empty-state copy/action contracts.
- `src/note-filters.ts` — pure helpers for note metadata normalization, filter option derivation, filtering, and sorting.
- `tests/*.test.ts` — validation coverage for engine behavior, confidence scoring, direct temporal/as-of helpers, schema contract, workspace service behavior, organization admin lifecycle, multi-team access scopes, personal-note privacy, historical workspace projections, dashboard aggregation/BFF routes, note update/draft/history persistence, workspace export/import, note filtering, guide helpers, empty-state helpers, map timeline/layout contracts, page layout, markdown commands, and BFF routes.

- `src/markdown-tools.ts` — pure helpers for markdown toolbar and slash-command formatting commands.

### Tradeoffs in this MVP

- Extraction is deterministic and transparent rather than LLM-backed. The interfaces are small enough to replace with model providers later.
- Supabase local development requires Docker Desktop to be running.
- The first extraction provider remains deterministic and transparent. Evidence-bearing saved-note edits reset derived claim/relation review state so stale analyst decisions do not silently attach to changed evidence.
- Confidence scoring is deterministic and bounded on the existing `claims.confidence` and `relations.score` fields. It is evidence-strength guidance for review and ordering, not an automated investment or compliance decision.
- Normalized research entities use deterministic/manual keys plus a small local ontology for the demo issuer/security set, parent industry sectors, and default demo watchlists. External security-master integration, portfolio-specific membership sync, and fuzzy source-person identity resolution are deferred.
- The current automated RLS test is a migration/schema contract test. Run `npm run supabase:start` and `npm run supabase:db:reset` in an environment with Docker Desktop running for live Supabase migration verification.
- Note import is text paste only: pasted notes/transcripts can be parsed into the workbench, but PDF/DOCX parsing, durable transcript chunks, audio transcription, and RMS integrations are deferred.
