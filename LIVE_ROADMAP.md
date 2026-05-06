# Mycelium — Live Roadmap

_Last updated: 2026-05-06_

This is the active build roadmap. It reflects the current repo state, not the original long-form product roadmap.

## North Star

Build the best research memory layer for investment teams: fast capture, trusted provenance, temporal claim relationships, and high-signal synthesis that shows what changed and why.

## Current Status

### Done

- [x] Product spec created.
- [x] Original phased roadmap created.
- [x] GitHub repo created and pushed.
- [x] Working local Vite/React/TypeScript MVP built.
- [x] Polished UX pass inspired by Notion, Granola, and Obsidian.
- [x] Deterministic local extraction for companies, tickers, themes, KPIs, and claims.
- [x] Mock permission-aware workspace lenses for Analyst, PM, and Compliance users.
- [x] Company/theme synthesis views.
- [x] In-app signals/alerts.
- [x] Temporal claim graph relation model implemented.
- [x] Time-aware distinction between true contradictions, trend reversals, tensions, corroboration, and stale evidence.
- [x] Seed data includes 12-month-apart opposing notes that classify as trend reversal rather than contradiction.
- [x] Validation passing: build + 6 engine tests.
- [x] Live agent context doc created.

### Current MVP Validation

```bash
npm run validate
```

Expected result:

- TypeScript/Vite production build passes.
- Engine tests pass:
  - entity/claim/temporal extraction,
  - permission filtering,
  - overlapping contradiction,
  - non-overlapping 12-month trend reversal,
  - stale evidence,
  - permission-aware temporal graph filtering.

## Priority Ladder

### P0 — Preserve the Core Contract

These must remain true after every change:

- Claims have source provenance and temporal metadata.
- Relation classification is time-aware.
- Permissions filter graph computation, not just rendering.
- `npm run validate` passes.
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
  - company/watchlist tags.
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
  - theme,
  - relation type,
  - author/team,
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
- [ ] Add confidence scoring by extraction quality, source type, and relation evidence strength.
- [ ] Add candidate retrieval abstraction for future vector search/RAG.
- [ ] Add optional LLM extraction interface with deterministic fallback.
- [ ] Add eval fixtures for known contradiction/reversal/stale examples.

### P4 — Backend + Security Foundation

Goal: move from in-browser mock to production-shaped architecture.

- [ ] Choose backend stack.
- [ ] Add real auth.
- [ ] Add server-side RBAC/ABAC.
- [ ] Add database schema for:
  - organizations,
  - users,
  - teams,
  - notes,
  - entities,
  - claims,
  - relations,
  - alerts,
  - review decisions,
  - audit events.
- [ ] Add audit log for note access, extraction, relation generation, and reviewer decisions.
- [ ] Add tenant isolation assumptions and tests.
- [ ] Add deployment path for private alpha.

### P5 — Real Input Sources

Goal: reduce friction for actual analysts.

- [ ] Import pasted meeting notes with templates.
- [ ] Add transcript/file upload path.
- [ ] Parse DOCX/PDF/TXT/Markdown.
- [ ] Add calendar/meeting metadata attachment.
- [ ] Add Slack/Teams/email ingest design, not necessarily implementation.
- [ ] Add source licensing/compliance notes for external data.

### P6 — External Evidence / News Flow

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
3. Add capture metadata controls for dates/windows.
4. Add relation detail drawer.
5. Add timeline/as-of filter.
6. Add tests for persisted review decisions and temporal filters.
7. Update `AGENT_CONTEXT.md`, `README.md`, and this roadmap.

## Product Questions to Resolve

- What is the first design-partner workflow: expert calls, company meetings, channel checks, earnings notes, or IC prep?
- Should the initial buyer be PM/research head or analyst power user?
- What minimum compliance posture is needed before real notes can be used?
- Should Mycelium start local-first/private-cloud, or hosted SaaS with strict tenant controls?
- How much manual review should be required before claims enter the graph?
- What is the alert threshold that avoids false-positive fatigue?

## Technical Questions to Resolve

- Graph storage: relational tables with graph-style queries first, or graph DB early?
- Vector search: pgvector/OpenSearch later, or stay deterministic for alpha?
- LLM strategy: model-provider abstraction, self-hosted option, or no-LLM alpha?
- Temporal model: fixed windows by source type, analyst-specified windows, or model-inferred windows with review?
- How should stale thresholds differ by sector/source type/KPI?

## Definition of Done for Major Changes

A change is not done until:

- Code builds.
- Tests pass.
- UX still preserves core capture/review/map/archive flows.
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
