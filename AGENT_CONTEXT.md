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
4. Add explicit stock/ticker/security and industry/sector linking to notes, claims, synthesis, and map filters.
5. Add source-person memory so prior notes by the same expert/company contact/analyst can surface sentiment changes and inconsistencies.
6. Add import paths for real notes, transcripts, files, and audio.
7. Design transcription as a first-class capture path with timestamped transcript chunks, speaker diarization, correction workflow, and compliance/consent controls.
8. Add a mobile capture roadmap: quick text notes, voice memos, offline queue, lightweight claim review, and high-signal push notifications.
9. Introduce model-backed extraction behind an auditable interface only after the deterministic contract is stable.

## Agent Operating Notes

- Keep the temporal claim graph as the center of gravity.
- Do not collapse relation types back into simple contradiction/agreement.
- Preserve `npm run validate` before reporting success.
- Avoid paid APIs or secret requirements unless explicitly requested.
- Keep docs current when architecture, product direction, or validation changes.
- If adding AI calls later, keep deterministic fallbacks and source citations.
