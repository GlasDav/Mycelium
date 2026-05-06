# MVP Implementation Plan

## Scope

Build a local-first demo web app that proves the core Mycelium loop without paid APIs or secrets:

1. Capture/import research notes.
2. Extract companies, tickers, themes, KPIs, and atomic claims using deterministic heuristics.
3. Compare accessible claims for agreement and contradiction.
4. Show permission-aware workspace behavior through user/role toggles.
5. Synthesize company/theme views from the claim graph.
6. Generate useful in-app alerts for contradictions, agreement clusters, and restricted-note visibility.

## Architecture

- **Vite + React + TypeScript** frontend.
- **Local deterministic intelligence engine** in `src/engine.ts`.
- **Seed data** in `src/data.ts` so the product is immediately usable.
- **Mock RBAC**: users can see public notes plus their team's restricted notes; PM/Admin can see all workspace notes.
- **No external APIs**. The extraction interface is deliberately local and replaceable later by model-backed providers.

## MVP UX Direction

The UI uses a dark, editorial “research war-room” aesthetic: parchment cards, acid-lime signal accents, dense annotations, and a living graph feel. It should look like an analyst cockpit, not a generic SaaS dashboard.

## Validation

- `npm run build` typechecks and produces the app bundle.
- `npm test` validates deterministic extraction, permissions, and relation detection.
