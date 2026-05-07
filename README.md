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

- Calm research-capture workspace with editable note titles, display-mode markdown editing, formatting toolbar, slash-command formatting palette, undo/redo controls, explicit blank-note action, and keyboard-friendly `Cmd/Ctrl + Enter` note intake.
- Collapsible all-notes sidebar with collapsible search/filter controls, non-stretching dense one-line title/date rows, click-to-load note behavior, plus search, sort, date, stock/ticker, theme, KPI, and visibility filters.
- True note metadata for observed date, visibility, stocks/tickers, themes, and KPIs, persisted through the BFF and Supabase. Applies-to windows and horizon are inferred for extracted claims and edited during claim review rather than entered on the note form.
- Supabase Auth-backed sign-in/sign-up flow with organization/profile/team bootstrap.
- Supabase Postgres schema, raw migrations, RLS policies, and audit/event tables for a production path from day one.
- Fastify backend-for-frontend that serves `/api/*`, materializes the temporal claim graph, and can serve the built React app as one deployable Node service.
- Authenticated workspace JSON export/import routes for demo restore workflows.
- Deterministic local extraction of companies, tickers, themes, KPIs, and claims with live preview.
- Claim direction classification with citation snippets, approve/reject/edit review state, and persisted relation review controls.
- Temporal relationship detection across accessible notes, with dates explaining why an opposing read is a true contradiction vs a trend reversal.
- Server-side permission filtering for Analyst, PM, and Compliance roles.
- Synthesized company/theme views with backlinks, current-vs-historical stance summaries, and supporting/skeptical claim evidence.
- Relationship-map affordance for a temporal claim graph with red contradictions, amber tensions, blue reversals, green corroboration, and grey stale evidence.
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
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MYCELIUM_ORG_SEED_DOMAIN=example.test
PORT=5174
```

The migration in `supabase/migrations/202605060001_production_foundation.sql` creates organizations, profiles, teams, notes with stock/theme/KPI metadata arrays, claims, relations, audit events, extraction jobs, auth bootstrap triggers, and RLS policies.

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

- `MVP_PLAN.md` — concise implementation plan and validation approach.
- `src/engine.ts` — deterministic extraction, temporal relation detection, synthesis, and alerts.
- `server/workspace-service.ts` — server-side graph materialization, permission-filtered workspace snapshots, workspace JSON export/import, claim/relation review behavior, and extraction provider boundary.
- `server/app.ts` — Fastify BFF routes for workspace, workspace export/import, notes, claim review, relation review, audit events, and auth bootstrap.
- `server/supabase-repository.ts` — Supabase repository adapter used by the BFF.
- `supabase/migrations/202605060001_production_foundation.sql` — production-shaped Postgres schema and RLS policies.
- `src/main.tsx` — Supabase Auth-backed workspace UI: capture, observed/visibility controls, stock/theme/KPI metadata, notes sidebar, slash-command markdown editing, live extraction, claim editing, relationship review, alerts, and archive.
- `src/note-filters.ts` — pure helpers for note metadata normalization, filter option derivation, filtering, and sorting.
- `tests/*.test.ts` — validation coverage for engine behavior, direct temporal helpers, schema contract, workspace service behavior, workspace export/import, note filtering, markdown commands, and BFF routes.

- `src/markdown-tools.ts` — pure helpers for markdown toolbar and slash-command formatting commands.

### Tradeoffs in this MVP

- Extraction is deterministic and transparent rather than LLM-backed. The interfaces are small enough to replace with model providers later.
- Supabase local development requires Docker Desktop to be running.
- The first extraction provider remains deterministic and transparent. The server-side provider interface is ready for later model-backed extraction without changing UI or persistence contracts.
- The current automated RLS test is a migration/schema contract test. Run `npm run supabase:start` and `npm run supabase:db:reset` in an environment with Docker Desktop running for live Supabase migration verification.
- Note import is text paste only; PDF/DOCX parsing and RMS integrations are deferred.
