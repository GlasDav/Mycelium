# Mycelium — Agent Context

_Last updated: 2026-05-07_

This is the live orientation file for agents working on Mycelium. Read this before changing product, UX, engine, roadmap, or docs.

## Project in One Sentence

Mycelium is a secure investment research intelligence workspace that turns analyst notes into a permission-aware temporal claim graph so teams can see what they believe, what changed, what contradicts current evidence, and why.

## Current Product State

The repo contains a production-shaped MVP foundation:

- Vite + React + TypeScript app.
- Fastify backend-for-frontend serving `/api/*` and the production React bundle.
- Supabase Auth/Postgres/RLS project files and raw migrations.
- Deterministic local intelligence engine; no paid APIs or secrets required.
- Supabase auth trigger bootstraps organizations, profiles, teams, memberships, and demo notes for new local accounts.
- Server-side graph materialization for notes, claims, relations, audit events, and extraction jobs.
- Minimal note-taking-first research workspace UI with auth, stock/theme/KPI metadata capture, titled display-mode markdown note editing with toolbar shortcuts, undo/redo controls, explicit blank-note action, rendered archive display, collapsible all-notes sidebar, collapsible sidebar filters, non-stretching dense one-line note rows, live extraction side panel, workspace pulse, claim editing, relation review, and responsive mobile layout.
- Tests covering extraction, schema/RLS contract, BFF routing, permissions, temporal contradiction logic, trend reversals, stale evidence, review decisions, relation filtering, note metadata persistence, note sidebar filtering helpers, sidebar layout density, and markdown toolbar formatting helpers.

Run it:

```bash
npm install
npm run supabase:start
npm run dev
```

Validate it:

```bash
npm run validate
```

## Core Product Thesis

The durable asset is not a chat interface or generic RAG layer. It is the **temporal claim graph**:

- Claims extracted from notes.
- Claims connected to companies, themes, KPIs, authors, notes, permissions, and validity windows.
- Relations classified by time/context, not naive text disagreement.
- Synthesis generated from graph state with source provenance.

RAG/vector retrieval may later help find candidate related claims, but the graph remains the source of truth. A custom neural network is premature until the product has enough labeled usage data.

## Current Architecture

### Frontend

- `src/main.tsx` now includes Supabase Auth, note capture, editable title field, display-mode markdown editor, undo/redo controls, blank-note reset action, stock/theme/KPI metadata controls, collapsible all-notes sidebar and filters, live extraction, workspace pulse, subject navigation, synthesis, claim editing, relationship review, relationship map, and archive modes.
- `src/note-filters.ts` owns pure note metadata normalization, option derivation, filtering, and sorting helpers for the sidebar.
- `src/markdown-tools.ts` owns pure markdown toolbar transformations for inline marks, headings, lists, quotes, indentation, underline, and font-size spans.
- `src/api.ts` provides browser API/auth helpers for the Fastify BFF and Supabase Auth.

- `src/styles.css` — minimal note-taking-first visual system and responsive layout.
- `index.html` — Vite entry.

### Backend

- `server/index.ts` is the single-service Node entrypoint.
- `server/app.ts` defines Fastify BFF routes for auth bootstrap, workspace, notes, claims, relations, and audit events.
- `server/workspace-service.ts` owns graph materialization, permission-filtered snapshots, review state, audit events, and the extraction provider contract.
- `server/supabase-repository.ts` adapts the workspace service to Supabase.

### Supabase

- `supabase/config.toml` configures local Supabase.
- `supabase/migrations/202605060001_production_foundation.sql` creates organizations, profiles, teams, team memberships, notes with `tickers`, `manual_themes`, and `kpis` metadata arrays, claims, relations, audit events, extraction jobs, auth trigger, helper functions, indexes, and RLS policies.

### Intelligence Engine

- `src/engine.ts` — deterministic MVP pipeline:
  - `detectEntities`
  - `directionFor`
  - `extractClaims`
  - `buildClaims`
  - `detectRelations`
  - `classifyTemporalRelation`
  - `synthesize`
  - `generateAlerts`
  - `runPipeline`

### Data

- Supabase demo notes are seeded by `app.seed_demo_notes` when a local auth user creates an organization.
- `src/data.ts` — seed users and notes.
- Includes 12-month-apart Nvidia examples so old bearish reads become trend reversals/stale evidence rather than false contradictions.

### Tests

- `tests/schema.test.ts` checks the migration/RLS contract.
- `tests/workspace-service.test.ts` checks server-side materialization, permissions, audit, claim edit/reject, relation dismissal/reclassification.
- `tests/bff.test.ts` checks Fastify API auth and route behavior.
- `tests/note-filters.test.ts` checks note metadata normalization, option derivation, filtering, and sorting.
- `tests/markdown-tools.test.ts` checks markdown toolbar command transforms.
- `tests/main-ui-source.test.ts` and `tests/layout-css.test.ts` check expected note-capture/sidebar UI contracts.
- `tests/engine.test.ts` — core deterministic behavior.

### Planning / Product Docs

- `PRODUCT_SPEC.md` — long-form product spec.
- `ROADMAP.md` — original phased roadmap.
- `MVP_PLAN.md` — current MVP implementation plan.
- `LIVE_ROADMAP.md` — live build roadmap and next priorities.
- `AGENT_CONTEXT.md` — this file.

## Temporal Claim Graph Model

### Claim Fields

Each claim should carry:

- `subject` — company/entity.
- `text` — extracted atomic claim.
- `direction` — `positive`, `negative`, or `neutral`.
- `themes` — related product/sector themes.
- `securities` / `tickers` — explicit stock/security links, ideally mapped through a security master or watchlist.
- `industries` / `sectors` — explicit industry/sector/theme links, not just inferred free-text tags.
- `sourcePeople` — external experts, company contacts, meeting participants, or internal authors tied to the claim when known.
- `observedAt` — when the evidence was observed.
- `appliesToStart` / `appliesToEnd` — validity/decision window.
- `horizon` — `point_in_time`, `near_term`, `quarter`, `year`, or `unknown`.
- `freshness` — `fresh`, `aging`, or `stale`.
- provenance: `noteId`, `authorId`, `team`, `visibility`, evidence snippet.

### Relation Types

Use these relation labels consistently:

- `contradiction` — red. Opposing claims about the same subject/topic with materially overlapping validity windows.
- `update_or_trend_reversal` — blue. Newer claim opposes an older claim, but their validity windows do not materially overlap.
- `historical_tension` — amber. Opposing claims with small/partial overlap or unclear historical context.
- `open_tension` — amber. Opposing claims with ambiguous or insufficient window context.
- `corroboration` — green. Aligned claims with compatible windows.
- `agreement` — green/neutral. Aligned claims where windows are separated but still informative.
- `stale_evidence` — grey. Older evidence no longer likely decision-useful beside newer evidence.

### Time Rule That Matters

Two notes can disagree without being a contradiction. If a May 2025 note says demand was weak and a May 2026 note says demand is strong, that is usually a **trend reversal/update**, not a contradiction.

A contradiction should fire strongly only when the claims overlap in:

- entity/company,
- topic/KPI/theme,
- direction,
- validity window,
- access permissions,
- same stock/security or industry context where relevant,
- source-person context where relevant,
- and enough evidence similarity to be meaningfully comparable.

### Stock / Industry Linking

Notes should be explicitly linkable to stocks/securities and industries/sectors, even when entity extraction is imperfect. Treat these as first-class graph nodes, not just text tags. The product should support many-to-many links:

- one note can mention multiple stocks and industries;
- one claim can attach to a specific security, issuer, KPI, and industry;
- synthesis and map filters should work by company, ticker/security, industry/sector, theme, watchlist, and portfolio relevance.

### Source-Person Memory

Notes should be aware of prior notes by or about the same people. This matters for expert calls, company meetings, management comments, and internal analyst work. Track person-level history so Mycelium can show:

- sentiment changes by the same person over time;
- self-inconsistencies where a person contradicts their earlier view within overlapping windows;
- credible trend reversals where the same person updates their view after conditions changed;
- disagreement between different people separately from a person changing their own mind.

Identity confidence matters: ambiguous transcript speakers or common names should stay reviewable rather than silently merged.

## Current UX Shape

The app has three main modes:

1. **Claim review** — capture note, preview extracted entities/claims, review synthesis.
2. **Relationship map** — graph-like relation view with labels and temporal explanation.
3. **Note archive** — permission-aware visible notes.

Design principles:

- Note-taking is the primary surface: the first viewport should prioritize titled markdown writing or pasting research notes.
- Intelligence panels should support capture without overwhelming it: the dense notes sidebar handles navigation, while collapsible sidebar filters, live extraction, workspace pulse, and signals support capture/review.
- Keep the header compact and functional rather than hero-like.
- Calm, fast capture like Granola.
- Clear workspace hierarchy like Notion.
- Connected knowledge/backlink feel like Obsidian.
- Explicit trust boundaries: hidden notes are excluded from graph computation, not merely hidden in UI.
- Relation explanations must show why something is or is not a contradiction.

## Current Validation Status

As of 2026-05-07:

- `npm run validate` passes.
- Build passes.
- 34/34 tests pass.
- Supabase CLI is installed through npm scripts. Live local Supabase verification requires Docker Desktop to be running.

## Known MVP Tradeoffs

- Extraction is deterministic heuristic logic, not LLM-backed.
- Permissions are enforced in the server-side workspace service and represented in Supabase RLS policies.
- Note capture is typed/pasted text only.
- Real Supabase Auth and Postgres/RLS schema are present; deployment still needs real hosted Supabase credentials.
- No external news/filings ingestion yet.
- Relationship topic matching is still coarse: shared company + themes/keyword overlap.
- The map is an affordance, not a full interactive graph canvas yet.

## Next Best Work

See `LIVE_ROADMAP.md`. The highest-leverage next phase is to turn the demo into a durable alpha:

1. Add persistence and server-enforced permissions.
2. Improve temporal claim extraction and analyst review controls.
3. Build a richer relationship map with timeline/as-of controls.
4. Add explicit stock/ticker/security and industry/sector linking to notes, claims, synthesis, and map filters.
5. Add source-person memory so prior notes by the same expert/company contact/analyst can surface sentiment changes and inconsistencies.
6. Add import paths for real notes, transcripts, files, and audio.
7. Design transcription as a first-class capture path with timestamped transcript chunks, speaker diarization, correction workflow, and compliance/consent controls.
8. Add a mobile capture roadmap: quick text notes, voice memos, offline queue, lightweight claim review, and high-signal push notifications.
9. Introduce model-backed extraction behind an auditable interface only after the deterministic contract is stable.

## Agent Operating Notes

- Keep the temporal claim graph as the center of gravity.
- Preserve the note-taking-first UI hierarchy when iterating on the frontend.
- Do not collapse relation types back into simple contradiction/agreement.
- Preserve `npm run validate` before reporting success.
- Avoid paid APIs or secret requirements unless explicitly requested.
- Keep docs current when architecture, product direction, or validation changes.
- If adding AI calls later, keep deterministic fallbacks and source citations.
