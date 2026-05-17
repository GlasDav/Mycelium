# Mycelium — Live Roadmap

_Last updated: 2026-05-17_

This is the active build roadmap. It reflects the current repo state, not the original long-form product roadmap.

## North Star

Build the best research memory layer for investment teams: fast capture, trusted provenance, temporal claim relationships, and high-signal synthesis that shows what changed and why.

## Current Status

### Done

- [x] Product spec created.
- [x] Original phased roadmap created.
- [x] GitHub repo created and pushed.
- [x] Working local Vite/React/TypeScript MVP built.
- [x] Initial polished dark editorial UX pass inspired by Notion, Granola, and Obsidian.
- [x] Minimal note-taking-first UI pass with headerless aligned workbench, large primary editor, live extraction side panel, workspace pulse, recent notes rail, and responsive mobile layout.
- [x] Premium institutional workstation UI pass added:
  - persistent context header with page/note/scope/as-of/save state,
  - compact status toasts and disabled/read-only/saving feedback,
  - `Cmd/Ctrl+K` command palette with keyboard selection,
  - focus mode for note capture,
  - ontology-backed metadata token suggestions while preserving manual entries,
  - actionable dashboard drilldowns into Map and Archive,
  - active map filter chips, polished current/historical lanes, and selected-relation density pinning,
  - relation review controls in the detail drawer,
  - imported premium CSS partial with focus-visible and responsive layout coverage.
- [x] Collapsible all-notes sidebar with collapsible search/filter controls, non-stretching dense one-line title/date rows, click-to-load note behavior, and search, sort, date, stock/ticker, theme, KPI, access scope/location, and team filters.
- [x] Explicit blank-note action in the note workbench; sample prompt buttons removed.
- [x] Titled display-mode markdown note editor with formatting toolbar, slash-command palette, keyboard shortcuts, undo/redo controls, and markdown archive display.
- [x] Left-rail page navigation now renders separate notes, dashboard, relationship map, and full-width archive pages instead of crowding every surface into the front page.
- [x] Notes is now a clean current-note surface:
  - workspace pulse, signals, synthesis, and broad source-person memory moved off Notes,
  - live extraction stays beside the editor,
  - saved claim/relation review is filtered to the selected saved note.
- [x] Scoped research dashboard added:
  - BFF route `/api/dashboard`,
  - service types for workspace/team/org scope and 30-day/90-day/all-time ranges,
  - role-gated true org aggregates for PM/Compliance,
  - native CSS/SVG-style cards, bars, freshness donut, top metadata lists, signals, and source-person coverage.
- [x] True note metadata arrays for stocks/tickers, manual themes, and KPIs persisted through the BFF and Supabase notes table.
- [x] API-level workspace JSON export/import so demos can be restored through authenticated BFF routes.
- [x] Deterministic local extraction for companies, tickers, themes, KPIs, and claims.
- [x] Direct temporal helper tests for horizon inference, applies-to defaults, and relation boundary behavior.
- [x] Mock permission-aware workspace lenses for Analyst, PM, and Compliance users.
- [x] Company/theme synthesis views.
- [x] In-app signals/alerts.
- [x] Temporal claim graph relation model implemented.
- [x] Time-aware distinction between true contradictions, trend reversals, tensions, corroboration, and stale evidence.
- [x] Seed data includes 12-month-apart opposing notes that classify as trend reversal rather than contradiction.
- [x] Validation passing: build + 184 default tests.
- [x] Review spine completed:
  - claim review cards persist analyst review notes on save, approve, and reject,
  - relation review cards persist analyst review notes on confirm, dismiss, and reclassify,
  - relationship map exposes a selected-relation detail drawer with claim snippets, date windows, overlap, score, reviewer state, and explanation.
- [x] Relationship Map v2 timeline slice added:
  - `GET /api/workspace?asOf=YYYY-MM-DD` returns permission-aware historical graph projections,
  - claims use known-by-date semantics and recompute freshness for the selected as-of date,
  - map UI adds as-of control, current/historical lanes, author/team filters, and low/medium/high density controls.
- [x] Local Supabase development ports moved to the `5532x` range to avoid Windows/Docker reserved `5432x` port conflicts.
- [x] Live agent context doc created.
- [x] Production-first foundation added:
  - Supabase Auth/Postgres/RLS migration and local config,
  - Fastify backend-for-frontend,
  - single Node service build/start path,
  - server-side graph materialization,
  - claim editing/review state,
  - relation confirm/dismiss/reclassify state,
  - audit events and extraction job tables.
- [x] Production persistence spine added:
  - explicit save for selected notes through the BFF/Supabase path,
  - server-backed recoverable workbench drafts,
  - read-only note revision history drawer,
  - author-only note update enforcement,
  - evidence-bearing note edits reset derived claim/relation review state,
  - workspace export/import preserves dismissed relation decisions.
- [x] Normalized research entity layer added:
  - `research_entities`, note entity links, and claim entity links with access-following RLS,
  - shared `LinkedEntity` metadata contract with legacy array compatibility,
  - note/claim links for securities, industries, themes, KPIs, watchlists, companies, and source people,
  - source-person relation context and workspace person-memory summaries.
- [x] Expanded metadata UX added:
  - Personal/Team/Organisation location controls and active team selection,
  - securities/tickers, industries/sectors, themes, KPIs, watchlists, and participants controls,
  - addable live extraction suggestions,
  - archive/sidebar/map filters for normalized metadata,
  - claim participant correction and source-person memory panel.
- [x] Richer empty states added:
  - action-backed no-notes/no-filter/no-graph/no-claims/no-relations/no-person-memory states,
  - pure helper tests for guide content/storage and empty-state copy/actions.
- [x] Organisation-first workspace structure added:
  - org admin/member status and active/deactivated profiles,
  - multi-team memberships with active/archived teams,
  - pending signup invites without email delivery,
  - canonical Personal/Team/Organisation note location and access scope,
  - author-only personal notes that contribute only to the author's private graph.
- [x] Deterministic engine stage split added behind the stable `src/engine.ts` facade:
  - focused modules now cover types, lexicons, access, temporal helpers, entity extraction, claim extraction, relation candidates/classification, synthesis, alerts, and pipeline orchestration,
  - existing app/server/test imports continue to use the public facade.
- [x] Candidate retrieval abstraction added:
  - `detectRelations` now accepts an injectable candidate retriever before temporal classification,
  - the default deterministic retriever preserves current relation candidate selection and output behavior.
- [x] Conservative topic/KPI matching added:
  - deterministic same-subject candidate matching now recognizes business-driver families beyond shared words,
  - topic matching is internal and matching-only, with no claim KPI enrichment, schema changes, LLM calls, or vector search.
- [x] Local stock/security and industry ontology v1 added:
  - canonical issuer and ticker aliases for the demo coverage set,
  - ontology-backed `LinkedEntity` normalization for securities, companies, industries, and watchlists,
  - parent sector derivation for known industries,
  - default demo watchlist membership derived from known securities/issuers,
  - issuer-aware relation candidate matching for edited subject aliases.
- [x] Confidence scoring v1 added:
  - deterministic extraction confidence now uses direction clarity, metadata, temporal evidence, and explicit source-person links,
  - relation score now represents bounded evidence strength using endpoint confidence, candidate match strength, temporal fit, relation type, and source-person context,
  - the existing `claims.confidence` and `relations.score` fields remain the public/persisted contract with no schema migration.
- [x] Pasted note/transcript import v1 added:
  - Notes-only import panel parses pasted meeting notes and transcript text into title, observed date, body, participants, and linked metadata,
  - imports apply to the unsaved workbench for analyst review instead of auto-saving,
  - existing `/api/notes` creation handles import-shaped payloads with no new route, schema, or RLS changes.
- [x] TXT/Markdown file import v1 added:
  - Notes-only import panel reads `.txt`, `.md`, and `.markdown` files client-side,
  - imported file text uses the same parser preview and unsaved workbench apply path,
  - no backend upload route or attachment storage was added.
- [x] DOCX/PDF file import v1 added:
  - Notes-only import panel reads `.docx` and `.pdf` files client-side,
  - DOCX document text and selectable PDF text use the same parser preview and unsaved workbench apply path,
  - scanned/image-only PDF OCR, durable file storage, and backend upload routes remain deferred.
- [x] Optional extraction-provider seam added:
  - server graph materialization can use an injected async claim extraction provider,
  - provider drafts are normalized through deterministic temporal/provenance/confidence helpers,
  - deterministic fallback handles missing, empty, malformed, or throwing providers without SDKs, env vars, or paid APIs.
- [x] Relationship map layout harness added:
  - pure map lane helper owns current/historical assignment, density budgets, selected relation fallback, endpoint labels, data-driven node positions, and overflow counts,
  - the UI remains dependency-free and does not add a graph visualization library.
- [x] Opt-in live Supabase RLS smoke test added:
  - `npm run test:supabase:live` checks local auth bootstrap and same-domain invite gating when Supabase is running,
  - the test skips cleanly when Docker/local Supabase is unavailable and is not part of `npm run validate`.

### Current MVP Validation

```bash
npm run validate
```

Expected result:

- TypeScript/Vite production build passes.
- Server bundle build passes.
- Engine and production-foundation tests pass:
  - entity/claim/temporal extraction,
  - permission filtering,
  - overlapping contradiction,
  - non-overlapping 12-month trend reversal,
  - stale evidence,
  - table-driven temporal eval fixtures for contradiction/reversal/tension/corroboration/agreement/stale cases,
  - deterministic and injected relation candidate retrieval,
  - async extraction-provider fallback and draft normalization,
  - conservative topic/KPI candidate matching,
  - deterministic extraction confidence and relation evidence scoring,
  - ontology-backed issuer/security aliases, industry hierarchy, and default demo watchlists,
  - permission-aware temporal graph filtering,
  - migration/RLS schema contract including normalized entity links plus opt-in live RLS smoke coverage,
  - Fastify BFF route auth,
  - server-side graph materialization,
  - persisted note edits, server drafts, note history, and claim/relation review behavior.
  - normalized note/claim metadata persistence,
  - source-person relation context and memory summaries.
  - historical workspace as-of projections and map timeline/layout contracts.
  - note filtering and sorting helpers.
  - premium context header, command palette, metadata token options, dashboard drilldowns, and imported premium CSS contracts.
  - page-level notes/dashboard/map/archive layout and full-width archive behavior.
  - pasted note/transcript plus TXT/Markdown/DOCX/PDF file import parsing, UI contracts, and existing note-create route contracts.
  - markdown toolbar/slash-command helpers and sidebar layout/metadata contracts.
  - dashboard route aggregation, guide helper storage/content, and empty-state copy/action contracts.
  - organization admin lifecycle, invite/team/member tests, multi-team access scopes, and personal-note graph privacy.

## Priority Ladder

### P0 — Preserve the Core Contract

These must remain true after every change:

- Claims have source provenance and temporal metadata.
- Relation classification is time-aware.
- Permissions filter graph computation, not just rendering.
- `npm run validate` passes.
- Note capture remains the primary first-viewport workflow.
- The UI explains why something is a contradiction, reversal, tension, corroboration, or stale evidence.

### P1 — Turn Demo into Durable Local Alpha

Goal: make the app feel like a real product a design partner could use with sample/limited data.

- [x] Add persistent production storage for notes, server drafts, note history, and review state.
- [x] Add export/import for workspace JSON so demos survive reloads.
- [x] Improve note capture metadata controls:
  - observed date,
  - Personal/Team/Organisation location and access scope,
  - active team selection for team-scoped notes,
  - linked stocks/securities/tickers,
  - linked industries/sectors/themes,
  - company/watchlist tags,
  - source people/meeting participants.
- [x] Keep claim validity metadata out of note intake:
  - infer applies-to windows and horizon during extraction,
  - let analysts review/edit those fields on extracted claims,
  - avoid source type as a user-facing note metadata field unless a future import/compliance flow needs it.
- [x] Add Notion-like slash command formatting to the display-mode markdown editor:
  - open a formatting palette when typing `/`,
  - support headings, lists, quotes, and text styling commands,
  - keep keyboard behavior compatible with the existing toolbar and undo/redo flow.
- [x] Add premium capture ergonomics:
  - context-aware shell header,
  - focus mode,
  - keyboard command palette,
  - save/draft/read-only status and compact toasts,
  - metadata token suggestions backed by the local ontology.
- [x] Add explicit stock and industry linking UX:
  - attach notes to one or more tickers/securities,
  - attach notes to one or more industries/sectors/themes,
  - support manual correction when entity extraction is wrong,
  - show linked stocks/industries in archive, synthesis, and map filters.
- [x] Add claim edit/review controls:
  - edit subject,
  - edit direction,
  - edit applies-to window,
  - mark false positive,
  - approve/reject extracted claim.
- [x] Add relation review controls:
  - confirm relation,
  - dismiss relation,
  - reclassify relation type,
  - leave analyst note.
- [x] Persist dismissed/confirmed relation decisions.
- [x] Add richer empty states and cleanly separate current-note Notes from broad dashboard intelligence.

### P2 — Relationship Map v2

Goal: make the map the product’s “aha” moment.

- [x] Add true timeline/as-of control.
- [x] Let users filter map by:
  - company, **done through subject rail,**
  - stock/ticker/security, **done,**
  - industry/sector/theme, **done,**
  - relation type, **done,**
  - author/team, **done,**
  - source person/meeting participant, **done,**
  - freshness, **done.**
- [x] Add current vs historical lanes.
- [x] Add detail drawer for selected relation:
  - both evidence snippets,
  - date windows,
  - overlap days,
  - confidence,
  - reviewer state,
  - explanation.
- [x] Add graph density controls so the map stays readable.
- [x] Add dependency-free map layout helper and overflow counts so density limits are explicit.
- [x] Keep selected relations visible under density limits and expose active filter chips with one-click clearing.
- [ ] Consider a lightweight graph visualization library only if real pilot density proves the lane model is insufficient.

### P3 — Better Intelligence Layer

Goal: improve extraction/relation quality while keeping explainability.

- [x] Split deterministic engine into explicit stages/interfaces:
  - ingestion,
  - entity extraction,
  - claim extraction,
  - temporal window inference,
  - candidate retrieval,
  - relation classification,
  - synthesis,
  - alerting.
- [x] Add unit tests around temporal helper functions directly.
- [x] Improve topic/KPI matching beyond shared words.
- [x] Add stock/security and industry ontology layer:
  - issuer/company aliases,
  - ticker/security identifiers,
  - industry/sector hierarchy,
  - default demo watchlist membership,
  - many-to-many note ↔ stock and note ↔ industry links.
- [x] Add source-person memory v1:
  - identify recurring people across notes/transcripts,
  - link claims to the person who said them when available,
  - compare a person’s latest view against their own prior notes,
  - flag sentiment changes, thesis drift, and self-inconsistencies,
  - distinguish “person changed view over time” from “two people disagree.”
- [x] Add confidence scoring by extraction quality, explicit source-person evidence, and relation evidence strength.

Current implementation note: normalized note/claim entity links are live for securities, industries, themes, KPIs, watchlists, companies, and source people. Conservative topic/KPI relation matching is internal to deterministic candidate selection and does not enrich claim metadata. Confidence scoring is deterministic and bounded on the existing claim confidence and relation score fields. The local ontology v1 covers the demo issuer/security set, parent industry sectors, and default demo watchlist membership without external providers or schema changes. External security-master providers, richer portfolio-specific membership, fuzzy source-person identity resolution, and identity-confidence workflows beyond explicit source-person scoring evidence remain deferred.
- [x] Add candidate retrieval abstraction for future vector search/RAG.
- [x] Add optional LLM extraction interface with deterministic fallback. **Done as an async provider seam with no model wiring.**
- [x] Add eval fixtures for known contradiction/reversal/stale examples.

### P4 — Backend + Security Foundation

Goal: move from in-browser mock to production-shaped architecture.

- [x] Choose backend stack: Supabase-first with Fastify BFF.
- [x] Add real auth via Supabase Auth.
- [x] Add server-side RBAC/ABAC enforcement in the workspace service and RLS policy layer.
- [x] Add database schema for core production tables:
  - organizations,
  - users,
  - teams,
  - notes with stock/theme/KPI metadata arrays and normalized linked metadata compatibility,
  - entities/security/industry/source-person link tables,
  - claims,
  - relations,
  - review decisions,
  - audit events,
  - extraction jobs.
- [x] Add audit log for note creation, graph materialization, and reviewer decisions.
- [x] Add tenant isolation assumptions and migration/RLS contract tests.
- [x] Add deployment path for private alpha: `npm run build` + `npm start` serves API and React from one Node process.
- [x] Add entity/security/industry/source-person tables and links.
- [x] Add organization administration for org admin/member status, active/archived teams, pending invites, active team assignments, and deactivation guards.
- [x] Add live Supabase RLS integration tests once Docker Desktop is available in the environment. **Done as an opt-in smoke test that skips when local Supabase is unavailable.**

### P5 — Real Input Sources + Transcription

Goal: reduce friction for actual analysts by capturing research where it already happens: calls, meetings, transcripts, files, chat, and mobile notes.

- [x] Import pasted meeting notes with templates. **Done for Notes-only pasted note/transcript import v1.**
- [x] Add transcript/file upload path. **Done for client-side TXT/Markdown/DOCX/PDF content import; durable file storage remains deferred.**
- [x] Parse DOCX/PDF/TXT/Markdown. **Done for client-side text extraction; scanned-PDF OCR remains deferred.**
- [ ] Add audio upload transcription for expert calls, company meetings, and internal research discussions.
- [ ] Add live/near-live meeting transcription design:
  - speaker diarization,
  - timestamped transcript chunks,
  - source confidence,
  - correction workflow,
  - explicit consent/compliance controls.
- [ ] Convert transcript chunks into reviewed claims with source timestamps and temporal windows.
- [ ] Add calendar/meeting metadata attachment.
- [ ] Add Slack/Teams/email ingest design, not necessarily implementation.
- [ ] Add source licensing/compliance notes for external data.

### P6 — Mobile Capture App

Goal: make capture effortless at the edge — immediately after meetings, calls, conferences, site visits, and channel checks.

- [ ] Define mobile app scope: capture-first companion, not full desktop replacement.
- [ ] Add mobile note capture:
  - quick text note,
  - voice memo,
  - photo/document attachment,
  - company/theme/watchlist tags,
  - Personal/Team/Organisation location and team selector.
- [ ] Add mobile transcription flow for voice memos and recorded meetings.
- [ ] Add offline-first queue for flights, conferences, and field research.
- [ ] Add push notifications for high-signal contradictions, trend reversals, and review requests.
- [ ] Add mobile claim review-lite:
  - approve/reject extracted claims,
  - fix company/entity,
  - adjust date window,
  - mark sensitive/MNPI concern.
- [ ] Evaluate implementation path:
  - React Native / Expo for speed,
  - PWA first if backend is not ready,
  - native later only if audio/background capture requires it.

### P7 — External Evidence / News Flow

Goal: connect internal claims to external corroboration/contradiction.

- [ ] Define external event schema.
- [ ] Add watchlist/portfolio prioritization.
- [ ] Add SEC/ASX/news ingestion prototype.
- [ ] Classify external events against internal claims.
- [ ] Alert only when external evidence changes the current view or stale status.

## Near-Term Recommended Sprint

### Sprint: Durable Alpha Spine

**Outcome:** A user can capture notes, review extracted claims/relations, reload the app, and continue where they left off.

Suggested tasks:

1. Add production persistence layer. **Done.**
2. Add claim/relation review state. **Done.**
3. Keep the note-first capture workbench focused on observed date, location/access scope, active team selection, and linked metadata while claim windows and horizon are inferred and reviewed on claims. **Done.**
4. Add stock/ticker and industry linking controls. **Done.**
5. Add source-person/participant field and person-level history view. **Done.**
6. Add relation detail drawer. **Done.**
7. Split clean current-note Notes from scoped research Dashboard. **Done.**
8. Add timeline/as-of filter. **Done.**
9. Add tests for persisted review decisions, server drafts/history, temporal filters, stock/industry links, source-person sentiment changes, current-note Notes scope, and dashboard aggregation. **Done for normalized metadata/source-person v1 plus dashboard/current-note scope.**
10. Add a slash-command formatting palette to the markdown editor. **Done.**
11. Update `AGENT_CONTEXT.md`, `README.md`, and this roadmap.
12. Premiumize the UI into an institutional workstation while preserving note-first capture and the dependency-free map. **Done.**

## Product Questions to Resolve

- What is the first design-partner workflow: expert calls, company meetings, channel checks, earnings notes, or IC prep?
- Should the initial buyer be PM/research head or analyst power user?
- What minimum compliance posture is needed before real notes can be used?
- Should Mycelium start local-first/private-cloud, or hosted SaaS with strict tenant controls?
- How much manual review should be required before claims enter the graph?
- What is the alert threshold that avoids false-positive fatigue?
- Should “same people” tracking mean internal analyst authors, external experts/company contacts, or both?
- How should source-person identity resolution work when transcripts contain ambiguous names or speaker labels?

## Technical Questions to Resolve

- Graph storage: relational tables with graph-style queries first, or graph DB early?
- Vector search: pgvector/OpenSearch later, or stay deterministic for alpha?
- LLM strategy: model-provider abstraction, self-hosted option, or no-LLM alpha?
- Temporal model: analyst-specified windows, deterministic/model-inferred windows, or inferred windows with claim-level review?
- How should stale thresholds differ by sector, source-person context, and KPI?
- What should follow the local ontology first: a provider security master, GICS/custom fund taxonomy import, or portfolio/watchlist sync from customer data?
- Should person-level sentiment history be modeled as its own timeline, or as filtered views over the claim graph?

## Definition of Done for Major Changes

A change is not done until:

- Code builds.
- Tests pass.
- UX still preserves core notes/dashboard/map/archive flows.
- First-viewport UI still feels like note-taking software, with intelligence panels supporting capture rather than crowding it.
- Permissions still affect graph computation.
- Temporal relation behavior is not regressed.
- Relevant docs are updated:
  - `AGENT_CONTEXT.md`,
  - `LIVE_ROADMAP.md`,
  - `README.md` if setup/user-facing behavior changed.

## Parking Lot

- Full interactive graph canvas.
- Hosted backend.
- Real-time collaboration.
- External news/filings ingestion.
- Slack/Teams notifications.
- LLM-backed extraction.
- Full compliance admin console.
- Portfolio/watchlist integration.
- Native mobile app if PWA/Expo cannot support required audio capture, offline sync, or enterprise controls.
