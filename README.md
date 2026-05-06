# Investment Research Intelligence

A B2B investment research intelligence product concept: a secure research notes workspace that extracts investment claims, detects contradictions/agreements across analysts' notes, synthesizes industry assessments, and monitors news flow for corroborating or contradicting evidence.

## Core Idea

Investment teams produce valuable private research in meeting notes, expert calls, channel checks, earnings notes, and internal discussions. That knowledge is usually fragmented across documents, chat, CRM/RMS systems, and individual notebooks.

This product turns those notes into a **permission-aware claim graph**:

- What do we believe?
- Who said it?
- What evidence supports it?
- What contradicts it?
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
- Structured investment claim extraction with source citations.
- Contradiction/agreement detection across teammates' notes.
- Company and industry/theme synthesis from multiple notes.
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
5. Surface high-confidence contradictions/agreements.
6. Notify relevant teammates.
7. Update company/theme synthesis.

## Non-Goals

- Not a trading signal generator.
- Not a Bloomberg/FactSet replacement.
- Not a generic notes app.
- Not an automated compliance or MNPI determination tool.

It is decision-support infrastructure for organizing evidence and surfacing disagreement; humans remain responsible for investment decisions and compliance judgments.
