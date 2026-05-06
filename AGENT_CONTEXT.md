# Mycelium — Agent Context

_Last updated: 2026-05-06_

This is the live orientation file for agents working on Mycelium. Read this before changing product, UX, engine, roadmap, or docs.

## Project in One Sentence

Mycelium is a secure investment research intelligence workspace that turns analyst notes into a permission-aware temporal claim graph so teams can see what they believe, what changed, what contradicts current evidence, and why.

## Current Product State

The repo contains a working local MVP:

- Vite + React + TypeScript app.
- Deterministic local intelligence engine; no paid APIs or secrets required.
- Seed demo data for analysts, PM, compliance, companies, notes, claims, permissions, and temporal examples.
- Polished dark editorial research-workspace UI inspired by Notion, Granola, and Obsidian.
- Tests covering extraction, permissions, temporal contradiction logic, trend reversals, stale evidence, and relation filtering.

Run it:

```bash
npm install
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

- `src/main.tsx` — primary React app and UX flows.
- `src/styles.css` — product styling and visual system.
- `index.html` — Vite entry.

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

- `src/data.ts` — seed users and notes.
- Includes 12-month-apart Nvidia examples so old bearish reads become trend reversals/stale evidence rather than false contradictions.

### Tests

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
- and enough evidence similarity to be meaningfully comparable.

## Current UX Shape

The app has three main modes:

1. **Claim review** — capture note, preview extracted entities/claims, review synthesis.
2. **Relationship map** — graph-like relation view with labels and temporal explanation.
3. **Note archive** — permission-aware visible notes.

Design principles:

- Calm, fast capture like Granola.
- Clear workspace hierarchy like Notion.
- Connected knowledge/backlink feel like Obsidian.
- Explicit trust boundaries: hidden notes are excluded from graph computation, not merely hidden in UI.
- Relation explanations must show why something is or is not a contradiction.

## Current Validation Status

As of 2026-05-06:

- `npm run validate` passes.
- Build passes.
- 6/6 engine tests pass.

## Known MVP Tradeoffs

- Extraction is deterministic heuristic logic, not LLM-backed.
- Permissions are mocked client-side only.
- Note capture is typed/pasted text only.
- No persistent backend or auth.
- No external news/filings ingestion yet.
- Relationship topic matching is still coarse: shared company + themes/keyword overlap.
- The map is an affordance, not a full interactive graph canvas yet.

## Next Best Work

See `LIVE_ROADMAP.md`. The highest-leverage next phase is to turn the demo into a durable alpha:

1. Add persistence and server-enforced permissions.
2. Improve temporal claim extraction and analyst review controls.
3. Build a richer relationship map with timeline/as-of controls.
4. Add import paths for real notes/transcripts.
5. Introduce model-backed extraction behind an auditable interface only after the deterministic contract is stable.

## Agent Operating Notes

- Keep the temporal claim graph as the center of gravity.
- Do not collapse relation types back into simple contradiction/agreement.
- Preserve `npm run validate` before reporting success.
- Avoid paid APIs or secret requirements unless explicitly requested.
- Keep docs current when architecture, product direction, or validation changes.
- If adding AI calls later, keep deterministic fallbacks and source citations.
