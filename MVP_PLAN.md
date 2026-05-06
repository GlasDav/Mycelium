# MVP Implementation Plan

## Scope

Build a local-first demo web app that proves the core Mycelium loop without paid APIs or secrets:

1. Capture/import research notes.
2. Extract companies, tickers, themes, KPIs, and atomic claims using deterministic heuristics.
3. Compare accessible claims as a temporal claim graph, not a simple contradiction detector.
4. Show permission-aware workspace behavior through user/role toggles.
5. Synthesize company/theme views from the claim graph.
6. Generate useful in-app alerts for true contradictions, tensions, trend reversals, stale evidence, corroboration clusters, and restricted-note visibility.

## Architecture

- **Vite + React + TypeScript** frontend.
- **Local deterministic intelligence engine** in `src/engine.ts` with explicit temporal helpers for windows, overlap, freshness, and relation classification.
- **Seed data** in `src/data.ts` so the product is immediately usable.
- **Mock RBAC**: users can see public notes plus their team's restricted notes; PM/Admin can see all workspace notes.
- **Temporal claim graph model**: each claim carries `observedAt`, `appliesToStart`, `appliesToEnd`, `horizon`, and `freshness`. Opposing overlapping claims become red contradictions; non-overlapping 12-month reversals become blue updates/trend reversals; unclear overlap becomes amber tension; aligned compatible reads become green corroboration; old decision-irrelevant reads become grey stale evidence.
- **No external APIs**. The extraction interface is deliberately local and replaceable later by model-backed providers.

## MVP UX Direction

The UI uses a dark, editorial “research war-room” aesthetic: parchment cards, acid-lime signal accents, dense annotations, and a living graph feel. The relationship map must make time visible with an as-of marker, date windows, and clear labels explaining why two snippets are or are not contradictions.

## Validation

- `npm run build` typechecks and produces the app bundle.
- `npm test` validates deterministic extraction, permissions, overlapping contradiction detection, non-overlapping trend reversals, stale evidence, and relation filtering.
