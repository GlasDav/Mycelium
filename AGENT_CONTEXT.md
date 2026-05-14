# Mycelium — Agent Context

_Last updated: 2026-05-14_

This is the live orientation file for agents working on Mycelium. Read this before changing product, UX, engine, roadmap, or docs.

## Project in One Sentence

Mycelium is a secure investment research intelligence workspace that turns analyst notes into a permission-aware temporal claim graph so teams can see what they believe, what changed, what contradicts current evidence, and why.

## Current Product State

The repo contains a production-shaped MVP foundation:

- Vite + React + TypeScript app.
- Fastify backend-for-frontend serving `/api/*` and the production React bundle.
- Supabase Auth/Postgres/RLS project files and raw migrations.
- Deterministic local intelligence engine; no paid APIs or secrets required.
- Supabase auth trigger bootstraps the first organization admin, profile, team membership, and demo notes for a new local organization; later same-domain users require pending organization invites.
- Server-side graph materialization for notes, claims, relations, deterministic extraction confidence, relation evidence strength, normalized research entities, note/claim entity links, source-person summaries, note drafts, note revision history, audit events, and extraction jobs.
- Deterministic local ontology v1 for core demo issuers/securities, ticker aliases, issuer aliases, industry/sector hierarchy, and default watchlist membership; no external security-master provider required.
- Minimal note-taking-first research workspace UI with auth, observed-date/location controls for Personal, Team, and Organisation notes, team selection for active memberships, normalized stock/security, industry/sector, theme, KPI, watchlist, and participant metadata capture, titled display-mode markdown note editing with toolbar shortcuts, slash-command formatting palette, undo/redo controls, explicit blank-note action, selected-note explicit save, server-backed draft recovery, read-only note history drawer, richer action-backed empty states, left-rail page navigation for notes/dashboard/map/archive/admin, full-width rendered archive display, collapsible all-notes sidebar, collapsible sidebar filters, non-stretching dense one-line note rows, live extraction side panel with addable suggestions, current-note claim/relation review, scoped research dashboard with workspace/team/org toggles and 30-day/90-day/all-time ranges, organization admin lifecycle controls, relationship detail drawer, source-person dashboard coverage, server-backed map as-of timeline, current/historical map lanes, map author/team/metadata filters, map density controls, and responsive mobile layout. Source type is not user-facing note metadata; claim applies-to windows and horizon are inferred during extraction and reviewed at the claim layer.
- API-level workspace JSON export/import for demo restore through authenticated BFF routes, including dismissed relation review decisions.
- Tests covering extraction, confidence scoring, ontology canonicalization, direct temporal helper behavior, table-driven temporal eval fixtures, historical as-of workspace snapshots, schema/RLS contract, normalized entity links, BFF routing including scoped dashboard aggregates and workspace as-of queries, permissions, temporal contradiction logic, trend reversals, stale evidence, source-person relation context and memory summaries, review decisions and review notes, note editing, server drafts, note revision history, export/import restore including dismissed relations, relation filtering, relation detail UI contracts, map timeline/lane/density UI contracts, note metadata persistence, note sidebar filtering helpers, empty-state copy/actions, sidebar layout density, page navigation, dashboard layout, archive width, and markdown toolbar/slash-command formatting helpers.

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
- Claims connected to companies, securities, industries, themes, KPIs, watchlists, source people, authors, notes, permissions, and validity windows.
- Relations classified by time/context, not naive text disagreement.
- Synthesis generated from graph state with source provenance.

RAG/vector retrieval may later help find candidate related claims, but the graph remains the source of truth. A custom neural network is premature until the product has enough labeled usage data.

## Current Architecture

### Frontend

- `src/main.tsx` now includes Supabase Auth, note capture, editable title field, display-mode markdown editor, slash-command formatting palette, undo/redo controls, blank-note reset action, selected-note explicit save, Personal/Team/Organisation note location controls, organization admin page, server-backed draft restore, read-only history drawer, normalized security/industry/theme/KPI/watchlist/participant metadata controls, addable live extraction suggestions, collapsible all-notes sidebar and filters, action-backed empty states, current-note claim/relation intelligence on Notes, scoped dashboard metrics/charts/signals/source-person coverage, relationship map as-of timeline, current/historical lanes, author/team/metadata filters, density controls, relation detail drawer, and separate notes/dashboard/map/archive/admin page bodies.
- `src/ontology.ts` owns the deterministic local issuer/security/industry/watchlist ontology used by extraction, linked-entity canonicalization, derived sector/watchlist metadata, and issuer-aware relation candidate matching.
- `src/entity-links.ts` owns shared normalized entity/link metadata helpers, legacy array compatibility, key normalization, ontology-backed canonicalization, and derived metadata arrays.
- `src/note-filters.ts` owns pure note metadata normalization, option derivation, filtering, and sorting helpers for the sidebar.
- `src/markdown-tools.ts` owns pure markdown toolbar and slash-command transformations for inline marks, headings, lists, quotes, indentation, underline, and font-size spans.
- `src/api.ts` provides browser API/auth helpers for the Fastify BFF and Supabase Auth.

- `src/styles.css` — minimal note-taking-first visual system and responsive layout.
- `index.html` — Vite entry.

### Backend

- `server/index.ts` is the single-service Node entrypoint.
- `server/app.ts` defines Fastify BFF routes for auth bootstrap, workspace including `asOf` historical projections, scoped dashboard aggregates, organization admin lifecycle, workspace export/import, notes, note drafts, note history, claims, relations, and audit events.
- `server/workspace-service.ts` owns graph materialization, permission-filtered snapshots, Personal/Team/Organisation access scopes, multi-team membership, organization admin lifecycle, known-by-date historical as-of graph projections, role-gated dashboard aggregation, workspace JSON export/import, normalized linked metadata compatibility, note editing/history, server drafts, source-person memory summaries, review state, audit events, and the extraction provider contract.
- `server/supabase-repository.ts` adapts the workspace service to Supabase, including organization admin/invite/team lifecycle persistence and normalized research entity and note/claim entity link persistence.

### Supabase

- `supabase/config.toml` configures local Supabase.
- Local Supabase ports intentionally use `55321`-series host ports (`55321` API, `55322` DB, `55323` Studio, `55324` Mailpit, `55327` analytics) because Windows/Docker environments can reserve the default `5432x` range.
- `supabase/migrations/202605060001_production_foundation.sql` creates organizations, profiles, teams, team memberships, notes with `tickers`, `manual_themes`, and `kpis` metadata arrays, claims, relations, audit events, extraction jobs, auth trigger, helper functions, indexes, and RLS policies.
- `supabase/migrations/202605090001_note_persistence_spine.sql` adds server-backed workbench drafts, note revision history, and author-only note update RLS.
- `supabase/migrations/202605090002_normalized_research_entities.sql` adds `research_entities`, note/claim entity link tables, draft/revision linked-entity JSON, access-following RLS policies, and supporting indexes.
- `supabase/migrations/202605100001_organization_admin_structure.sql` adds org admin/member status, active/archived teams, pending signup invites, nullable team links for personal/organization notes, canonical note/claim `access_scope`, and invite-aware auth bootstrap.

### Intelligence Engine

- `src/engine.ts` is the public compatibility facade used by the app, server, and tests.
- `src/engine/` now contains focused deterministic pipeline stages:
  - types and lexicons,
  - permission/access helpers,
  - confidence scoring,
  - temporal window and freshness helpers,
  - entity extraction,
  - claim extraction,
  - relation candidate retrieval/selection and temporal classification,
  - synthesis, alerts, source-person memory, and pipeline orchestration.
- The current engine is still deterministic and preserves the existing exported API; `detectRelations` now accepts an injectable candidate retriever while defaulting to deterministic candidate selection.
- Relation candidate selection now includes conservative topic/KPI business-driver matching for same-subject claims across demand/orders, supply/inventory, capex/budget, pricing/margin, growth/revenue, and adoption/churn wording. This matcher is internal and matching-only: it does not enrich extracted claim KPI metadata or change persisted graph schemas.
- Confidence scoring is deterministic and uses the existing persisted fields: `Claim.confidence` for extraction confidence and `Relation.score` for relation evidence strength. It combines direction clarity, explicit metadata, temporal evidence, endpoint confidence, match strength, relation type, and explicit source-person context without schema/API changes.
- Relation candidate selection treats ontology-resolved issuer aliases as the same subject, so manually edited subjects such as `Nvidia` and `NVIDIA Corporation` can still compare when the issuer identity matches.
- Optional LLM extraction remains future P3 work.

### Data

- Supabase demo notes are seeded by `app.seed_demo_notes` when a local auth user creates an organization.
- `src/data.ts` — seed users and notes.
- Includes 12-month-apart Nvidia examples so old bearish reads become trend reversals/stale evidence rather than false contradictions.

### Tests

- `tests/schema.test.ts` checks the migration/RLS contract, including normalized entity/link tables.
- `tests/workspace-service.test.ts` checks server-side materialization, permissions, audit, role-gated dashboard aggregation, workspace export/import restore, note update/history/drafts, normalized entity links, source-person memory summaries, claim edit/reject, relation dismissal/reclassification.
- `tests/bff.test.ts` checks Fastify API auth, scoped dashboard routes, note update/history/draft routes, normalized metadata round trips, export/import, and route behavior.
- `tests/note-filters.test.ts` checks note metadata normalization, option derivation, filtering, and sorting across securities, industries/themes, KPIs, watchlists, participants, access scope/location, team, and dates.
- `tests/markdown-tools.test.ts` checks markdown toolbar and slash-command transforms.
- `tests/demo-guide.test.ts`, `tests/empty-states.test.ts`, `tests/main-ui-source.test.ts`, and `tests/layout-css.test.ts` check guide helper storage/content, empty-state copy/actions, note-capture/sidebar metadata, current-note Notes scope, dashboard controls/layout, source-person coverage UI, map filters, page navigation, archive width, and layout contracts.
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
- provenance: `noteId`, `authorId`, `team`, `accessScope`, evidence snippet.
- access scope: `organization`, `team`, or `personal`; personal notes are author-only and can still contribute to that author's private workspace graph.

Current implementation note: securities, industries, themes, KPIs, watchlists, and source people now flow through normalized `LinkedEntity` metadata and Supabase note/claim entity link rows. Legacy `tickers`, `manualThemes`, and `kpis` arrays remain derived compatibility fields. The local ontology canonicalizes known issuer/security aliases, derives parent sector names for known industries, and derives default watchlist tags for the demo coverage set.

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

Notes are explicitly linkable to stocks/securities and industries/sectors, even when entity extraction is imperfect. These use first-class normalized graph nodes and link rows rather than only text tags. The product supports many-to-many links:

- one note can mention multiple stocks and industries;
- one claim can attach to a specific security, issuer, KPI, and industry;
- synthesis and map filters work by company, ticker/security, industry/sector, theme, watchlist, participant, relation type, and freshness. Portfolio relevance remains a later watchlist/portfolio integration.

Current ontology v1 is deliberately local and small: Nvidia/NVDA, Apple/AAPL, Tesla/TSLA, Shopify/SHOP, and Microsoft/MSFT plus adjacent sectors, industries, aliases, and demo watchlists. External security-master providers, GICS/custom taxonomy import, and portfolio-specific membership remain future work.

### Source-Person Memory

Notes and claims now carry source-person/participant links, and workspace snapshots include derived person-memory summaries over accessible claims. This matters for expert calls, company meetings, management comments, and internal analyst work. Track person-level history so Mycelium can show:

- sentiment changes by the same person over time;
- self-inconsistencies where a person contradicts their earlier view within overlapping windows;
- credible trend reversals where the same person updates their view after conditions changed;
- disagreement between different people separately from a person changing their own mind.

Source-person confidence v1 uses explicit/manual source-person links as deterministic scoring evidence on claims and relations. Fuzzy identity resolution and aliases beyond the stored alias array remain deferred.

## Current UX Shape

The app has five main left-rail page modes:

1. **Notes** — capture/edit the current note, preview extracted entities/claims, and review only saved claims/relations tied to the current note.
2. **Dashboard** — scoped workspace/team/org research intelligence with timeframe controls, metric cards, relation/freshness charts, signals, top metadata, and source-person coverage.
3. **Relationship map** — graph-like relation view with labels, server-backed as-of timeline, current/historical lanes, density controls, and temporal explanation.
4. **Note archive** — permission-aware visible notes.
5. **Organisation admin** — org-admin-only controls for teams, invitations, member roles, admin status, deactivation, and team assignments.

The left rail switches whole page bodies instead of toggling secondary tabs inside one crowded main page. Notes is clean and current-note only, Dashboard owns broad research/account metadata, Map focuses on relations and subject navigation, Archive renders filtered notes at full main-content width, and Organisation admin owns team/member/invite management without changing research-note permissions.

Design principles:

- Note-taking is the primary surface: the first viewport should prioritize titled markdown writing or pasting research notes.
- Intelligence panels should support capture without overwhelming it: the dense notes sidebar handles navigation, while collapsible sidebar filters and live extraction support capture. Broad workspace/team/org pulse, signals, synthesis-like summaries, and source-person coverage belong on Dashboard, not Notes.
- Keep shell chrome compact and functional rather than hero-like; the note workbench and live extraction should align with the notes sidebar at the top of the first viewport.
- Calm, fast capture like Granola.
- Clear workspace hierarchy like Notion.
- Connected knowledge/backlink feel like Obsidian.
- Explicit trust boundaries: hidden notes are excluded from graph computation, not merely hidden in UI.
- Relation explanations must show why something is or is not a contradiction.

## Current Validation Status

As of 2026-05-14:

- `npm run validate` passes.
- Build passes.
- 133/133 tests pass.
- Supabase CLI is installed through npm scripts. Live local Supabase verification requires Docker Desktop to be running.

## Known MVP Tradeoffs

- Extraction is deterministic heuristic logic, not LLM-backed.
- Permissions are enforced in the server-side workspace service and represented in Supabase RLS policies.
- Note capture is typed/pasted text only, with explicit save for existing notes and server-backed draft recovery for unsaved workbench content.
- Real Supabase Auth and Postgres/RLS schema are present; deployment still needs real hosted Supabase credentials.
- No external news/filings ingestion yet.
- Relationship topic matching and confidence scoring are deterministic and conservative; they handle a small set of business-driver term families and bounded evidence-strength heuristics but do not use fuzzy semantics, embeddings, or LLM calls.
- The map is a lane-based affordance, not a full interactive graph canvas yet.
- Normalized research entities use deterministic/manual keys plus the small local ontology for known issuers, securities, parent sectors, and default demo watchlists. There is still no external security-master provider, portfolio-specific membership provider, fuzzy source-person identity resolution, or identity-confidence workflow beyond explicit/manual source-person scoring evidence.

## Next Best Work

See `LIVE_ROADMAP.md`. The highest-leverage next phase is to turn the demo into a durable alpha:

1. Add persistence and server-enforced permissions.
2. Improve temporal claim extraction and analyst review controls.
3. Continue relationship map polish around graph readability, drilldowns, and richer visual layout.
4. Continue dashboard polish around richer drilldowns and production role semantics as pilot data clarifies team/org reporting expectations.
5. Add import paths for real notes, transcripts, files, and audio.
6. Design transcription as a first-class capture path with timestamped transcript chunks, speaker diarization, correction workflow, and compliance/consent controls.
7. Expand beyond the local ontology with a real security-master/taxonomy provider, portfolio-specific membership, and source-person identity confidence once real pilot data clarifies the right taxonomy.
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
