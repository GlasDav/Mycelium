# Mycelium — Live Roadmap

_Last updated: 2026-05-07_

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
- [x] Minimal note-taking-first UI pass with compact header, large primary editor, live extraction side panel, workspace pulse, recent notes rail, and responsive mobile layout.
- [x] Collapsible all-notes sidebar with collapsible search/filter controls, non-stretching dense one-line title/date rows, click-to-load note behavior, and search, sort, date, stock/ticker, theme, KPI, source type, and visibility filters.
- [x] Explicit blank-note action in the note workbench; sample prompt buttons removed.
- [x] Titled display-mode markdown note editor with formatting toolbar, keyboard shortcuts, undo/redo controls, and markdown archive display.
- [x] True note metadata arrays for stocks/tickers, manual themes, and KPIs persisted through the BFF and Supabase notes table.
- [x] Deterministic local extraction for companies, tickers, themes, KPIs, and claims.
- [x] Mock permission-aware workspace lenses for Analyst, PM, and Compliance users.
- [x] Company/theme synthesis views.
- [x] In-app signals/alerts.
- [x] Temporal claim graph relation model implemented.
- [x] Time-aware distinction between true contradictions, trend reversals, tensions, corroboration, and stale evidence.
- [x] Seed data includes 12-month-apart opposing notes that classify as trend reversal rather than contradiction.
- [x] Validation passing: build + 34 tests.
- [x] Live agent context doc created.
- [x] Production-first foundation added:
  - Supabase Auth/Postgres/RLS migration and local config,
  - Fastify backend-for-frontend,
  - single Node service build/start path,
  - server-side graph materialization,
  - claim editing/review state,
  - relation confirm/dismiss/reclassify state,
  - audit events and extraction job tables.

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
  - permission-aware temporal graph filtering,
  - migration/RLS schema contract,
  - Fastify BFF route auth,
  - server-side graph materialization,
  - persisted claim/relation review behavior.
  - note metadata persistence,
  - note filtering and sorting helpers.
  - markdown toolbar helpers and sidebar layout/source contracts.

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

- [ ] Add persistent local storage for notes and review state.
- [ ] Add export/import for workspace JSON so demos survive reloads.
- [ ] Improve note capture metadata controls:
  - observed date,
  - applies-to window,
  - source type,
  - visibility,
  - team,
  - linked stocks/securities/tickers,
  - linked industries/sectors/themes,
  - company/watchlist tags,
  - source people/meeting participants.
- [ ] Add explicit stock and industry linking UX:
  - attach notes to one or more tickers/securities,
  - attach notes to one or more industries/sectors/themes,
  - support manual correction when entity extraction is wrong,
  - show linked stocks/industries in archive, synthesis, and map filters.
- [ ] Add claim edit/review controls:
  - edit subject,
  - edit direction,
  - edit applies-to window,
  - mark false positive,
  - approve/reject extracted claim.
- [ ] Add relation review controls:
  - confirm relation,
  - dismiss relation,
  - reclassify relation type,
  - leave analyst note.
- [ ] Persist dismissed/confirmed relation decisions.
- [ ] Add richer empty states and first-run demo walkthrough.

### P2 — Relationship Map v2

Goal: make the map the product’s “aha” moment.

- [ ] Add true timeline/as-of control.
- [ ] Let users filter map by:
  - company,
  - stock/ticker/security,
  - industry/sector/theme,
  - relation type,
  - author/team,
  - source person/meeting participant,
  - freshness,
  - source type.
- [ ] Add current vs historical lanes.
- [ ] Add detail drawer for selected relation:
  - both evidence snippets,
  - date windows,
  - overlap days,
  - confidence,
  - reviewer state,
  - explanation.
- [ ] Add graph density controls so the map stays readable.
- [ ] Consider a lightweight graph visualization library only if it improves clarity without bloating the product.

### P3 — Better Intelligence Layer

Goal: improve extraction/relation quality while keeping explainability.

- [ ] Split deterministic engine into explicit stages/interfaces:
  - ingestion,
  - entity extraction,
  - claim extraction,
  - temporal window inference,
  - candidate retrieval,
  - relation classification,
  - synthesis,
  - alerting.
- [ ] Add unit tests around temporal helper functions directly.
- [ ] Improve topic/KPI matching beyond shared words.
- [ ] Add stock/security and industry ontology layer:
  - issuer/company aliases,
  - ticker/security identifiers,
  - industry/sector hierarchy,
  - watchlist/portfolio membership,
  - many-to-many note ↔ stock and note ↔ industry links.
- [ ] Add source-person memory:
  - identify recurring people across notes/transcripts,
  - link claims to the person who said them when available,
  - compare a person’s latest view against their own prior notes,
  - flag sentiment changes, thesis drift, and self-inconsistencies,
  - distinguish “person changed view over time” from “two people disagree.”
- [ ] Add confidence scoring by extraction quality, source type, source-person identity confidence, and relation evidence strength.
- [ ] Add candidate retrieval abstraction for future vector search/RAG.
- [ ] Add optional LLM extraction interface with deterministic fallback.
- [ ] Add eval fixtures for known contradiction/reversal/stale examples.

### P4 — Backend + Security Foundation

Goal: move from in-browser mock to production-shaped architecture.

- [x] Choose backend stack: Supabase-first with Fastify BFF.
- [x] Add real auth via Supabase Auth.
- [x] Add server-side RBAC/ABAC enforcement in the workspace service and RLS policy layer.
- [x] Add database schema for core production tables:
  - organizations,
  - users,
  - teams,
  - notes with stock/theme/KPI metadata arrays,
  - entities/security/industry/source-person links are deferred to the next schema pass,
  - claims,
  - relations,
  - review decisions,
  - audit events,
  - extraction jobs.
- [x] Add audit log for note creation, graph materialization, and reviewer decisions.
- [x] Add tenant isolation assumptions and migration/RLS contract tests.
- [x] Add deployment path for private alpha: `npm run build` + `npm start` serves API and React from one Node process.
- [ ] Add entity/security/industry/source-person tables and links.
- [ ] Add live Supabase RLS integration tests once Docker Desktop is available in the environment.

### P5 — Real Input Sources + Transcription

Goal: reduce friction for actual analysts by capturing research where it already happens: calls, meetings, transcripts, files, chat, and mobile notes.

- [ ] Import pasted meeting notes with templates.
- [ ] Add transcript/file upload path.
- [ ] Parse DOCX/PDF/TXT/Markdown.
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
  - visibility/team selector.
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

1. Add local persistence layer.
2. Add claim/relation review state.
3. Expand the current note-first capture workbench with real metadata controls for dates/windows.
4. Add stock/ticker and industry linking controls.
5. Add source-person/participant field and person-level history view.
6. Add relation detail drawer.
7. Add timeline/as-of filter.
8. Add tests for persisted review decisions, temporal filters, stock/industry links, and source-person sentiment changes.
9. Update `AGENT_CONTEXT.md`, `README.md`, and this roadmap.

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
- Temporal model: fixed windows by source type, analyst-specified windows, or model-inferred windows with review?
- How should stale thresholds differ by sector/source type/KPI?
- What canonical security master / industry taxonomy should the product use first: manual watchlist, GICS, custom fund sectors, or data-provider mapping?
- Should person-level sentiment history be modeled as its own timeline, or as filtered views over the claim graph?

## Definition of Done for Major Changes

A change is not done until:

- Code builds.
- Tests pass.
- UX still preserves core capture/review/map/archive flows.
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
