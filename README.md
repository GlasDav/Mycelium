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

- [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — detailed product specification covering positioning, personas, workflows, MVP, features, architecture, data model, AI pipeline, integrations, security/compliance, notifications, risks, open questions, and launch plan.
- [`ROADMAP.md`](./ROADMAP.md) — practical phased roadmap from discovery through private alpha, contradiction detection, synthesis, news integration, enterprise readiness, and GA.

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

This repo now includes a practical local MVP of the Mycelium investment research intelligence product.

### What it demonstrates

- Calm research-capture workspace with keyboard-friendly `Cmd/Ctrl + Enter` note intake.
- Deterministic local extraction of companies, tickers, themes, KPIs, and claims with live preview.
- Claim direction classification with citation snippets and a lightweight analyst review queue.
- Temporal relationship detection across accessible notes, with dates explaining why an opposing read is a true contradiction vs a trend reversal.
- Mock permission-aware workspace lenses for Analyst, PM, and Compliance users.
- Synthesized company/theme views with backlinks, current-vs-historical stance summaries, and supporting/skeptical claim evidence.
- Relationship-map affordance for a temporal claim graph with red contradictions, amber tensions, blue reversals, green corroboration, and grey stale evidence.
- In-app alerts for contradictions, tensions, reversals, corroboration clusters, stale evidence, and research-density changes.
- Permission-aware note archive and seed demo data so the app is useful immediately.

### Stack

- Vite
- React
- TypeScript
- Local heuristic intelligence engine (`src/engine.ts`)
- No paid APIs, secrets, or hosted model calls required

### Setup

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

### Validate

```bash
npm run validate
```

This runs a production build/typecheck and the deterministic engine tests.

### Useful files

- `MVP_PLAN.md` — concise implementation plan and validation approach.
- `src/engine.ts` — local extraction, permission filtering, temporal relation detection, synthesis, and alerts.
- `src/data.ts` — seed users and research notes, including 12-month-apart opposing reads that become trend reversals rather than contradictions.
- `src/main.tsx` — polished workspace UI: capture, live extraction, claim review, relationship map, alerts, and archive.
- `tests/engine.test.ts` — validation coverage for extraction, RBAC, overlapping contradictions, non-overlapping reversals, stale evidence, and permission filtering.

### Tradeoffs in this MVP

- Extraction is deterministic and transparent rather than LLM-backed. The interfaces are small enough to replace with model providers later.
- Permissions are mocked in-browser for product demonstration; production needs server-side enforcement, audit logs, and row/object-level access controls.
- Note import is text paste only; PDF/DOCX parsing and RMS integrations are deferred.
