# Investment Research Intelligence — Roadmap

## Roadmap Principles

- Start with one narrow, high-value investment workflow: notes → claims → contradictions.
- Build trust before breadth: citations, permissions, audit logs, and low alert noise are mandatory.
- Avoid becoming a generic note app or market data terminal.
- Integrate where analysts already work, but own the claim graph as the durable system of intelligence.
- Ship pilots with concierge onboarding and measurable outcomes.

## Phase 0 — Discovery and Validation (Weeks 0-4)

### Goals

- Validate buyer, pain intensity, compliance constraints, and initial workflow.
- Collect real note formats and contradiction examples.
- Define pilot success metrics.

### Workstreams

#### Customer Discovery

- Interview 15-25 people:
  - Portfolio managers.
  - Senior analysts.
  - Junior analysts.
  - COOs/CTOs.
  - Compliance officers.
- Segment interviews by fund type: L/S equity, long-only, family office, crossover.
- Identify current systems: docs, CRM/RMS, Slack/Teams, expert networks, Bloomberg/FactSet/AlphaSense.

#### Workflow Mapping

- Map how notes are currently captured, shared, searched, and used in investment committee prep.
- Identify common note types and required templates.
- Document where contradictions are currently missed.

#### Data and Compliance

- Ask what data can be used in pilots.
- Identify restricted-source and MNPI handling requirements.
- Determine appetite for hosted LLMs vs private endpoints.

#### Prototype Validation

- Create clickable mockups for:
  - Notes editor with extraction side panel.
  - Contradiction review UI.
  - Company claim dashboard.
  - News contradiction alert.
- Test alert language and severity thresholds.

### Exit Criteria

- 3-5 design partners willing to pilot.
- Agreed MVP workflow and success metrics.
- Sample anonymized notes or synthetic examples for evaluation.
- Clear compliance requirements for first pilots.

## Phase 1 — Private Alpha: Notes to Claim Graph (Weeks 5-10)

### Goal

Build the core loop: ingest notes, extract entities and claims, store them, search them, and show citations.

### Product Scope

#### Notes Workspace

- Rich text note creation and editing.
- Basic templates:
  - Management meeting.
  - Expert call.
  - Channel check.
  - Earnings/conference note.
- File upload: PDF, DOCX, TXT, transcript files.
- Manual metadata fields: date, note type, source type, companies/tickers, tags.

#### Entity Extraction

- Detect companies, tickers, people, industries, products, KPIs, geographies.
- Entity review and correction panel.
- Basic company/security resolution using a security master provider or curated dataset.

#### Claim Extraction

- Extract atomic claims with:
  - Claim text.
  - Subject entity.
  - Claim type.
  - Direction.
  - Time horizon.
  - Evidence snippet.
  - Confidence.
- Analyst accept/reject/edit flow.

#### Search

- Keyword and semantic search over notes and claims.
- Filters by company, tag, author, source type, date, claim type.
- Citation-first result presentation.

#### Foundations

- Organization/user model.
- Basic RBAC.
- PostgreSQL + pgvector.
- Object storage for attachments.
- Processing queue.
- Audit log for note and claim events.

### Technical Deliverables

- Data model implementation for notes, entities, claims, embeddings, audit events.
- AI extraction prompts with structured JSON output and validation.
- Evaluation harness for claim extraction quality.
- Permission-aware retrieval path.

### Success Metrics

- 80%+ of uploaded notes processed successfully.
- 70%+ analyst acceptance rate for extracted high-confidence claims.
- Entity resolution accuracy >90% in pilot coverage universe.
- Analysts can find prior relevant notes faster than current workflow.

### Risks

- Extraction quality varies by note style.
- Analysts may not review claims if UI is too slow.
- Entity ambiguity creates downstream noise.

## Phase 2 — Contradiction and Agreement Detection (Weeks 11-16)

### Goal

Deliver the product's first distinctive value: detecting agreements and contradictions across notes and teammates.

### Product Scope

#### Candidate Matching

- Match new claims against prior claims using:
  - Entity overlap.
  - KPI/claim type similarity.
  - Time horizon overlap.
  - Embedding similarity.
  - Author/team permissions.

#### Relationship Classification

- Classify candidate pairs:
  - Agrees.
  - Contradicts.
  - Partial contradiction.
  - Updates.
  - Qualifies.
  - Unrelated.
- Provide rationale and citations to both claims.
- Confidence and severity scoring.

#### Review UI

- Side-by-side claim comparison.
- Source note snippets.
- Accept/dismiss relationship.
- Add comment or assign follow-up.
- Update company thesis from resolved relationship.

#### Notifications V1

- In-app notification center.
- Slack or Teams high-severity alerts.
- Daily digest option.
- User/team preferences.

### Technical Deliverables

- Claim relationship table and relationship graph queries.
- Relationship classification prompt and validation.
- Alert decisioning service.
- Feedback capture for false positives/negatives.
- Threshold configuration per pilot customer.

### Success Metrics

- Top contradiction alert precision >60% in alpha.
- At least one meaningful cross-teammate contradiction or agreement found per active team per week.
- Alert dismissal due to “not relevant” below 40% by end of phase.
- Median processing time for a note under 3 minutes.

### Risks

- Semantic contradiction is hard and noisy.
- Analysts may disagree with AI relationship labels.
- Notifications can become annoying quickly.

## Phase 3 — Company and Theme Intelligence (Weeks 17-24)

### Goal

Turn the claim graph into useful company and industry assessments.

### Product Scope

#### Company Dashboards

- Current synthesized thesis.
- Bull/bear evidence.
- Claim timeline.
- Open questions.
- Recent changes.
- Contradictions requiring review.
- Coverage team and relevant notes.

#### Theme / Industry Pages

- Manual theme creation.
- Auto-suggested themes from repeated claim clusters.
- Driver-based synthesis:
  - Demand.
  - Pricing.
  - Margins/costs.
  - Inventory/channel.
  - Competition.
  - Regulation.
  - Catalysts/risks.
- Evidence clusters and disagreement sections.

#### Q&A V1

- Ask questions across accessible notes and claims.
- Answers cite source notes and claims.
- Display conflicting evidence explicitly.

#### IC Prep Export

- Generate investment committee prep brief.
- Export to PDF/DOCX/Markdown.
- Include citations and caveats.

### Technical Deliverables

- Synthesis generation pipeline.
- Incremental cache invalidation when new claims are added.
- Theme clustering jobs.
- Permission-aware Q&A service.
- Export service with audit logging.

### Success Metrics

- PMs use company dashboards before IC or portfolio reviews.
- 30%+ reduction in analyst-reported prep time for selected workflows.
- Q&A answers rated useful >70% of the time.
- Synthesis citations trusted by users.

### Risks

- Synthesis may overstate weak evidence.
- Theme clustering may create messy duplicate themes.
- Export functionality may trigger additional compliance review.

## Phase 4 — External News and Filing Corroboration (Weeks 25-34)

### Goal

Connect internal research claims to public news flow, filings, and transcripts.

### Product Scope

#### News/Filings Ingestion

- SEC EDGAR filings and company press releases.
- Public RSS/news APIs for pilots.
- Licensed provider connectors where customer has rights.
- Earnings transcript ingestion if licensed or supplied by customer.

#### External Claim/Event Extraction

- Extract external claims/events with source reliability metadata.
- Entity and KPI linking to internal graph.
- Preserve source licensing metadata.

#### Internal vs External Matching

- Detect:
  - News corroborates internal claim.
  - News contradicts internal claim.
  - News updates stale assumption.
  - New catalyst/risk affects holding.

#### Portfolio/Watchlist Prioritization

- Let users upload or connect portfolio/watchlist.
- Prioritize alerts by holdings and coverage.
- Company-specific notification settings.

### Technical Deliverables

- External item data model and ingestion jobs.
- Provider abstraction for news/data sources.
- External event extraction prompts.
- Claim-event matching classifier.
- Licensing-aware snippets and display rules.

### Success Metrics

- Relevant external alerts for portfolio/watchlist names.
- Users identify at least one news item per week that changes follow-up priorities.
- False-positive external alerts below agreed pilot threshold.
- No licensing/compliance issues in pilot usage.

### Risks

- News licensing complexity slows deployment.
- Public news creates many low-signal alerts.
- Entity linking across subsidiaries/products is difficult.

## Phase 5 — Enterprise Readiness and Paid Pilots (Weeks 35-48)

### Goal

Convert design partners to paid pilots and prepare for broader enterprise sales.

### Product Scope

#### Security and Admin

- SAML/OIDC SSO.
- SCIM provisioning for enterprise customers.
- Advanced RBAC and workspace permissions.
- Customer-managed retention policies.
- Audit log export.
- Restricted list/watchlist controls.
- Admin analytics.

#### Deployment and Data Controls

- Data region selection.
- Customer-managed keys where practical.
- Vendor model provider configuration.
- Optional private cloud/VPC architecture design.

#### Integrations

- Google Drive / OneDrive / SharePoint ingestion.
- Calendar prep integration.
- Slack and Teams production hardening.
- Zoom/Teams transcript import.
- CRM/RMS import feasibility for Bipsync/Salesforce/Affinity.

#### Customer Success

- Onboarding playbook.
- Evaluation scorecard.
- Weekly pilot review dashboard.
- Security documentation and DPIA/vendor questionnaires.

### Technical Deliverables

- SOC 2 readiness workstream.
- Penetration test remediation.
- Production observability and incident response processes.
- Usage/cost monitoring for AI tasks.
- Data export and deletion workflows.

### Success Metrics

- 3+ paid pilots live.
- Pilot-to-paid conversion path defined.
- Security questionnaire pass rate acceptable for target segment.
- Gross AI processing cost within pricing assumptions.
- 80%+ weekly active usage among pilot analysts.

### Risks

- Enterprise controls delay product iteration.
- Integration requests fragment roadmap.
- Long sales cycles require stronger ROI proof.

## Phase 6 — General Availability (Months 12-18)

### Goal

Launch a repeatable, secure research intelligence product for investment teams.

### Product Scope

- SOC 2 Type I complete; Type II in progress.
- Stable core workflows:
  - Notes capture.
  - Claims graph.
  - Contradiction detection.
  - Company/theme dashboards.
  - News corroboration.
  - Permission-aware Q&A.
- Enterprise admin console.
- Standard integration catalog.
- Pricing/packaging finalized.
- In-product onboarding and support resources.

### Go-To-Market

- Founder-led sales to research-intensive funds.
- Case studies from design partners.
- Security whitepaper.
- Demo flows by persona:
  - PM: contradiction surfaced before IC.
  - Analyst: meeting note creates useful follow-ups.
  - Compliance: audit trail and restricted controls.
- Content strategy around “claim graphs for fundamental research” and “AI that shows its work.”

### Success Metrics

- 10+ paying customers or equivalent ARR milestone.
- Repeatable onboarding under two weeks for standard teams.
- NPS/customer satisfaction strong among analysts and PMs.
- Net revenue expansion from seat growth or integrations.

## Backlog by Product Area

### Notes and Capture

- Mobile capture app.
- Voice note transcription.
- Browser extension for clipping public articles.
- Meeting bot for Zoom/Teams calls.
- Offline note drafts.

### Claim Intelligence

- Claim versioning and supersession chains.
- Confidence calibration by source type.
- Sector-specific claim schemas.
- KPI normalization and unit extraction.
- Stale assumption detection.
- Auto-generated diligence question lists.

### Graph and Synthesis

- Cross-company supply chain graph.
- Competitor comparison pages.
- Theme heatmaps.
- Industry mosaic dashboards.
- Investment thesis version history.
- “What changed?” weekly summaries.

### External Data

- Earnings transcript integration.
- Sell-side/public research ingestion with licensing controls.
- Alternative data annotations.
- Market data/event overlays.
- Regulatory monitoring by geography.

### Collaboration

- Threaded comments on claims.
- Assignments and task tracking.
- IC memo collaboration.
- Slack/Teams interactive alert actions.
- Shared watchlists.

### Compliance and Enterprise

- Legal hold.
- Advanced data loss prevention.
- Chinese wall / information barrier support.
- Custom retention by source type.
- eDiscovery export.
- Bring-your-own-model deployment.

## Prioritization Framework

Score roadmap items from 1-5 on:

1. User value for PM/analyst workflow.
2. Differentiation vs generic tools.
3. Trust/security requirement.
4. Implementation complexity.
5. Sales impact.
6. Dependency unlocks.

Default priority order:

1. Trust/security blockers.
2. Core claim graph quality.
3. Contradiction/agreement precision.
4. Workflow integrations that reduce capture friction.
5. Dashboards and synthesis.
6. Nice-to-have collaboration polish.

## Pilot Scorecard

Use this for each design partner.

### Setup

- Users onboarded.
- SSO configured.
- Initial notes imported.
- Portfolio/watchlist configured.
- Notification preferences set.

### Usage

- Notes added per week.
- Active users per week.
- Claims accepted/rejected.
- Searches/questions asked.
- Dashboards viewed.

### Quality

- Extraction acceptance rate.
- Entity resolution corrections.
- Contradiction alerts generated.
- Alerts accepted/dismissed.
- False positive reasons.
- Missed contradiction examples.

### Business Outcome

- Time saved in prep.
- Examples of useful surfaced evidence.
- Examples of avoided duplicate work.
- PM/analyst qualitative feedback.
- Renewal or paid conversion likelihood.

## Immediate Next Steps

1. Recruit 5 design partners from research-intensive investment teams.
2. Conduct workflow interviews and collect anonymized note samples.
3. Build evaluation set for entity/claim/contradiction detection.
4. Prototype notes editor, extraction panel, and contradiction review UI.
5. Decide initial deployment posture: hosted SaaS with enterprise model privacy vs private environment for first customers.
6. Define pilot security packet: architecture, data policy, subprocessors, retention, audit logs.
