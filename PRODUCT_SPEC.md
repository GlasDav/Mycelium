# Investment Research Intelligence — Product Spec

## 1. Summary

Investment Research Intelligence is a B2B knowledge product for investment teams that turns analyst meeting notes, channel checks, expert calls, earnings notes, and news flow into a living claim graph. It helps teams answer: **what do we believe, who said it, what supports it, what contradicts it, and what changed?**

The first product is a collaborative research notes workspace with AI extraction and contradiction detection. Analysts capture notes as usual. The system extracts companies, securities, industries, KPIs, claims, evidence, sentiment, time horizons, and confidence. It compares new notes against teammates' notes, prior firm research, and market/news data, then alerts the right people when there is agreement, contradiction, or useful corroboration.

## 2. Problem

Investment teams generate huge amounts of private qualitative research, but most of it is trapped in documents, inboxes, chat threads, CRM notes, and personal notebooks.

Current pain points:

- Analysts miss contradictions between their own notes and teammates' work.
- Portfolio managers struggle to synthesize bottom-up observations across analysts and sectors.
- Teams repeatedly rediscover the same facts from calls and meetings.
- News flow is monitored separately from internal research, so corroborating or disconfirming events are noticed late.
- Research conviction changes are hard to trace back to source evidence.
- Compliance risk rises when research provenance, MNPI controls, and access permissions are weak.

## 3. Product Positioning

### Positioning Statement

For investment teams that rely on original research, Investment Research Intelligence is a secure research intelligence layer that connects meeting notes, teammate insights, and news flow into a structured claim graph, so teams can detect contradictions, corroborate theses, and make faster, better-supported investment decisions.

### Category

Secure AI research intelligence platform for buy-side and sell-side investment teams.

### Differentiation

Unlike generic note apps, CRM systems, or document search tools, this product understands investment research primitives:

- Securities, issuers, sectors, industries, geographies, KPIs, catalysts, risks, consensus expectations.
- Claims, evidence, confidence, time horizon, and source provenance.
- Contradiction/agreement detection across private notes and external news.
- Team-based permissions, compliance logging, and investment workflow notifications.

### Competitive Alternatives

- General notes/docs: Notion, OneNote, Google Docs, Evernote.
- Research management systems: Bipsync, AlphaSense, Sentieo/AlphaSense Notebook, Tamale RMS, Canoe/CRM-like systems.
- Expert call libraries/transcription: Tegus, AlphaSense Expert Insights, Stream.
- Market/news tools: Bloomberg, FactSet, Refinitiv, CapIQ, RavenPack.
- Internal search/RAG systems built by quant/data teams.

## 4. Target Customers

### Primary ICP

Small-to-mid-sized investment managers with research-intensive workflows:

- Long/short equity funds.
- Long-only fundamental equity teams.
- Private equity growth/public market crossover teams.
- Multi-manager pods with sector analyst teams.
- Family offices with concentrated public equity portfolios.

### Secondary ICP

- Sell-side research teams looking to improve internal collaboration.
- Corporate strategy / investor relations intelligence teams.
- Credit research teams, especially where qualitative channel checks matter.

### Ideal Early Adopter Profile

- 5-50 investment professionals.
- Produces frequent internal notes from meetings, calls, and diligence.
- Has fragmented research across docs, email, Slack/Teams, and RMS.
- Has compliance sensitivity but can pilot with a subset of data.
- Has a portfolio manager or research head who feels the cost of missed contradictions.

## 5. Users and Personas

### Portfolio Manager / CIO

Goals:

- Understand current team conviction and what changed.
- Spot conflicting evidence before sizing positions.
- See cross-sector or industry pattern shifts.
- Ask, “What do we know about X?” and get sourced answers.

Needs:

- High-signal alerts, not every note.
- Thesis-level synthesis.
- Source traceability and confidence indicators.
- Dashboard by company, sector, theme, and portfolio holding.

### Senior Analyst

Goals:

- Capture meeting notes quickly.
- Compare new checks against prior notes and teammate views.
- Build and maintain company theses.
- Avoid missing disconfirming evidence.

Needs:

- Low-friction note capture.
- Automatic extraction with correction controls.
- Contradiction/agreement notifications.
- Entity, KPI, and catalyst timelines.

### Junior Analyst / Associate

Goals:

- Turn raw meeting notes into useful research artifacts.
- Find relevant prior notes before calls.
- Track open diligence questions.

Needs:

- Templates for meetings, expert calls, earnings, channel checks.
- Suggested tags and follow-ups.
- Searchable internal knowledge base.
- Citation-quality source links.

### Compliance Officer / COO

Goals:

- Ensure research access, audit trails, and MNPI controls.
- Validate retention policies and source provenance.
- Reduce unmanaged AI/data leakage risk.

Needs:

- Tenant isolation, role-based permissions, audit logs.
- Data residency and retention controls.
- Configurable restricted lists and watchlists.
- Model/data processing transparency.

## 6. Core Jobs To Be Done

1. **Capture research without changing analyst behavior.**
   - Analysts paste, upload, forward, or dictate notes.
   - Integrations ingest notes from docs, email, Slack/Teams, calendar, and transcripts.

2. **Extract investment claims and evidence.**
   - Identify who/what the note is about.
   - Convert unstructured notes into structured claims with provenance.

3. **Compare claims across the team's knowledge base.**
   - Detect agreement, contradiction, stale claims, and confidence shifts.
   - Link related claims across companies, sectors, KPIs, and themes.

4. **Synthesize industry and company assessments.**
   - Build living summaries from multiple notes.
   - Show consensus, divergence, and open questions.

5. **Monitor news flow against internal views.**
   - Alert when external events support, contradict, or update existing claims.
   - Explain why the news matters and which notes/theses are affected.

6. **Preserve compliance and source traceability.**
   - Every insight links to source notes and processing history.
   - Access respects team permissions and restricted information controls.

## 7. Key Workflows

### Workflow A: Analyst Adds Meeting Notes

1. Analyst creates or imports a note after a management meeting, expert call, supplier call, conference, or field visit.
2. Product auto-detects entities: companies, tickers, sectors, people, funds, geographies, products, KPIs.
3. AI extracts claims, evidence, sentiment, time horizon, confidence, and open questions.
4. Analyst reviews extraction in a side panel and accepts/corrects material claims.
5. System compares claims against:
   - Analyst's prior notes.
   - Teammates' notes accessible to the analyst.
   - Current company/industry thesis.
   - Recent news and filings.
6. Analyst sees immediate flags: “Contradicts Sarah's note from Apr 28 on gross margin recovery.”
7. Relevant teammates receive notification only if the contradiction/agreement crosses configured thresholds.

### Workflow B: PM Reviews Position Before Investment Committee

1. PM opens portfolio company dashboard.
2. Product shows:
   - Current synthesized thesis.
   - Top supporting claims.
   - Top contradicting claims.
   - Recent changes by confidence and recency.
   - Open diligence questions.
   - External news corroborating/contradicting internal notes.
3. PM drills into cited notes and asks natural-language questions.
4. PM exports an investment committee brief with citations and confidence levels.

### Workflow C: Industry Assessment From Multiple Notes

1. Analyst opens “US HVAC distributors” or “AI data center power demand” theme.
2. Product clusters notes by industry drivers, companies, KPIs, and supply chain nodes.
3. It generates a living industry assessment:
   - Demand trend.
   - Pricing.
   - Inventory/channel health.
   - Margin pressures.
   - Competitive dynamics.
   - Regulatory/capex catalysts.
4. It highlights where sources disagree and which claims are stale.

### Workflow D: News Flow Contradiction Alert

1. External news reports a material development, e.g., a major customer delays orders.
2. Product maps the article to portfolio companies, suppliers, competitors, KPIs, and prior internal claims.
3. It identifies affected notes: “Three recent checks assumed stable enterprise demand into Q3.”
4. Alert is sent to coverage analyst and PM with:
   - News summary.
   - Internal claims affected.
   - Suggested follow-up questions.
   - Confidence and severity.

### Workflow E: Pre-Meeting Prep

1. Analyst opens a calendar event or creates a prep page for a company meeting.
2. Product suggests:
   - Last notes with this company/person.
   - Open questions.
   - Claims needing validation.
   - Recent contradictory news.
   - Teammates who have relevant notes.
3. Analyst generates a meeting agenda and question list.

## 8. MVP Scope

### MVP Goal

Prove that the product can reliably extract investment-relevant claims from notes and detect useful contradictions/agreements across a small team's private research, while maintaining enterprise-grade security basics.

### MVP Users

5-15 users inside one investment team, focused on one or two sectors.

### MVP Features

1. **Secure workspace and auth**
   - SSO/SAML or Google/Microsoft login.
   - Organizations, teams, users, roles.
   - Basic RBAC: admin, PM, analyst, compliance viewer.

2. **Note capture**
   - Rich text editor with templates.
   - File upload for `.docx`, `.pdf`, `.txt`, transcript files.
   - Email-forward ingestion address.
   - Manual metadata: meeting type, date, source type, companies, tickers.

3. **Entity extraction**
   - Companies, tickers, industries, people, organizations, geographies.
   - KPI detection: revenue, margins, pricing, inventory, volumes, churn, bookings, backlog, capex.
   - Disambiguation UI for entity resolution.

4. **Claim extraction**
   - Claim text.
   - Subject entity.
   - Claim type: demand, pricing, cost, margin, competition, management quality, regulation, catalyst, risk, KPI trend.
   - Direction: positive, negative, neutral/mixed.
   - Time horizon: current quarter, next quarter, FY, multi-year, unspecified.
   - Evidence snippet and source note citation.
   - Confidence score and analyst-confirmed flag.

5. **Contradiction/agreement detection**
   - Compare new claims to prior accessible claims.
   - Rank matches by semantic similarity, shared entities, KPI overlap, and time horizon.
   - Classify relationship: agrees, contradicts, partially contradicts, updates, unrelated.
   - Side-by-side review UI.

6. **Notifications**
   - In-app notification center.
   - Slack/Teams digest integration.
   - Configurable thresholds by severity, company, portfolio holding, and teammate.

7. **Company and theme pages**
   - Claim timeline.
   - Current synthesis generated from verified claims.
   - Supporting vs contradicting evidence.
   - Open questions.

8. **Search and Q&A**
   - Search notes, claims, companies, themes.
   - Ask questions against accessible sources only.
   - Answers cite notes and claims.

9. **Audit and compliance basics**
   - Audit log for note creation, edits, AI extraction, exports, permission changes.
   - Retention settings.
   - No customer data used for model training by vendors.
   - Configurable restricted list tags.

### Explicit Non-MVP

- Fully automated trading signal generation.
- Real-time market data terminal replacement.
- Broad sell-side research ingestion at launch.
- Complex portfolio risk attribution.
- Automated compliance determinations.
- Multi-tenant data sharing between funds.

## 9. Detailed Feature Requirements

### 9.1 Notes Workspace

- Create, edit, tag, search, and archive notes.
- Note types:
  - Management meeting.
  - Expert call.
  - Customer/supplier/channel check.
  - Earnings call / conference.
  - Internal debate.
  - News/filing annotation.
- Templates with structured prompts.
- Attachments and transcripts.
- Source reliability metadata:
  - First-party management.
  - Expert network.
  - Customer/supplier.
  - Public news.
  - Internal opinion.
  - Sell-side/public research if licensed.
- Optional source anonymization for sensitive expert calls.

### 9.2 Claim Graph

The claim graph is the core product primitive. It connects:

- Notes.
- Claims.
- Evidence snippets.
- Entities.
- Analysts/users.
- Securities and portfolio holdings.
- Themes and industries.
- External news items.
- Relationships between claims.

Each claim should answer:

- What is being asserted?
- About which entity/KPI/theme?
- For what time period?
- Based on which source?
- Who captured it?
- How confident is the system/user?
- What supports or contradicts it?

### 9.3 Contradiction and Agreement Detection

Detection should combine deterministic filters and LLM classification.

Candidate generation:

- Same or related entity.
- Same industry/theme.
- Same KPI or claim type.
- Similar semantic embedding.
- Overlapping or adjacent time horizon.
- Portfolio/watchlist relevance.

Relationship classification:

- `AGREES`: materially supports the prior claim.
- `CONTRADICTS`: materially conflicts on direction, magnitude, timing, or causality.
- `PARTIAL_CONTRADICTION`: differs in one dimension, e.g., timing but not direction.
- `UPDATES`: newer claim supersedes an older claim.
- `QUALIFIES`: adds nuance or boundary conditions.
- `UNRELATED`: candidate match is not useful.

Severity scoring:

- Entity importance: portfolio holding > watchlist > other.
- Claim materiality: KPI/catalyst/risk > generic commentary.
- Source reliability and recency.
- Confidence of extraction and classification.
- Number of affected teammates/theses.
- Contradiction magnitude and investment impact.

### 9.4 Industry and Theme Synthesis

- Auto-create themes from repeated entities/topics or manual analyst creation.
- Cluster claims into drivers:
  - Demand.
  - Pricing.
  - Cost/input inflation.
  - Supply chain.
  - Inventory/channel.
  - Competition.
  - Regulation.
  - Customer behavior.
  - Technology/product cycles.
- Generate synthesis with citations.
- Separate verified analyst-accepted claims from unreviewed machine-extracted claims.
- Highlight contradictory clusters and confidence dispersion.
- Show trend over time: improving, deteriorating, mixed, unchanged.

### 9.5 News Flow Corroboration/Contradiction

- Ingest public news, filings, press releases, earnings transcripts, and optionally licensed news APIs.
- Entity link external items to companies, securities, people, products, geographies, and themes.
- Extract external claims/events.
- Compare external claims/events against internal claims.
- Alert types:
  - Corroborates internal thesis.
  - Contradicts internal thesis.
  - Material update to stale assumption.
  - New catalyst/risk related to portfolio holding.

Important: external news should not be treated as automatically true. It is another source with reliability metadata.

### 9.6 Collaboration

- Mention teammates in notes or claims.
- Assign follow-up questions.
- Comment on contradictions.
- Resolve or dismiss alerts with reason codes.
- Create shared thesis pages per company/theme.
- Digest views by team, company, sector, and portfolio holding.

### 9.7 Search and Q&A

- Hybrid search: keyword, entity, semantic, date, source type, teammate, confidence.
- Question-answering constrained by user permissions.
- Always cite sources.
- Show uncertainty and conflicting evidence, not just a single confident answer.
- Query examples:
  - “What have we heard about US SMB demand for Shopify since March?”
  - “Which notes contradict our long thesis on ACME margins?”
  - “What changed in our data center power equipment view this month?”

### 9.8 Admin and Compliance

- SSO/SAML/OIDC.
- SCIM user provisioning in enterprise tier.
- Role-based and attribute-based access controls.
- Matter/workspace level permissions.
- Restricted list and watchlist support.
- Audit logs exportable to compliance systems.
- Retention and legal hold policies.
- Data export and deletion workflows.
- Vendor model processing settings.
- Optional private cloud/VPC deployment for larger funds.

## 10. Data Model

### Core Entities

#### Organization

- `id`
- `name`
- `plan`
- `data_region`
- `retention_policy`
- `model_processing_policy`

#### User

- `id`
- `org_id`
- `name`
- `email`
- `role`
- `team_ids`
- `coverage_entities`
- `notification_preferences`

#### Team

- `id`
- `org_id`
- `name`
- `sector_focus`
- `default_permissions`

#### Note

- `id`
- `org_id`
- `author_id`
- `title`
- `body`
- `note_type`
- `source_type`
- `meeting_date`
- `created_at`
- `updated_at`
- `permissions`
- `source_reliability`
- `restricted_tags`
- `processing_status`

#### Entity

- `id`
- `org_id`
- `type`: company, security, person, industry, theme, geography, product, KPI.
- `name`
- `aliases`
- `external_ids`: ticker, FIGI, CIK, LEI, PermID, internal CRM id.

#### Claim

- `id`
- `org_id`
- `note_id`
- `author_id`
- `subject_entity_id`
- `claim_text`
- `normalized_claim`
- `claim_type`
- `direction`
- `magnitude`
- `time_horizon_start`
- `time_horizon_end`
- `evidence_snippet`
- `source_span_offsets`
- `confidence_score`
- `review_status`: machine, analyst_confirmed, analyst_rejected, edited.
- `materiality_score`
- `created_at`

#### ClaimRelationship

- `id`
- `org_id`
- `claim_a_id`
- `claim_b_id`
- `relationship_type`
- `severity_score`
- `classification_confidence`
- `rationale`
- `detected_at`
- `resolved_status`
- `resolved_by`
- `resolution_reason`

#### ExternalItem

- `id`
- `org_id`
- `source`
- `url`
- `title`
- `published_at`
- `body_or_summary`
- `entities`
- `license_metadata`
- `reliability_score`

#### Alert

- `id`
- `org_id`
- `recipient_user_id`
- `alert_type`
- `severity`
- `entity_ids`
- `claim_relationship_id`
- `external_item_id`
- `message`
- `status`: unread, read, dismissed, resolved.
- `created_at`

#### Thesis / Synthesis

- `id`
- `org_id`
- `entity_id_or_theme_id`
- `summary`
- `bull_points`
- `bear_points`
- `open_questions`
- `supporting_claim_ids`
- `contradicting_claim_ids`
- `generated_at`
- `reviewed_by`

### Storage Choices

- PostgreSQL for transactional entities, permissions, notes metadata, alerts, audit logs.
- Object storage for raw files and attachments.
- Vector database or pgvector for semantic retrieval over note chunks and claims.
- Graph layer:
  - Start with Postgres relational edges for MVP.
  - Consider Neo4j/TigerGraph/Neptune only if relationship traversal becomes complex.
- Search index: OpenSearch/Elasticsearch for full-text search and filters.

## 11. AI Pipeline

### Pipeline Overview

1. **Ingestion**
   - Note/document/transcript enters workspace.
   - Store immutable raw source.
   - Run OCR/transcription if needed.

2. **Preprocessing**
   - Normalize text.
   - Segment by topic/speaker/time.
   - Detect language.
   - Remove or mask sensitive fields where policy requires.

3. **Entity Extraction and Resolution**
   - NER for companies, people, sectors, products, KPIs, geographies.
   - Resolve companies to security master.
   - Ask user when ambiguity matters.

4. **Claim Extraction**
   - Extract atomic claims with evidence spans.
   - Normalize into structured schema.
   - Assign confidence and materiality.

5. **Embedding and Indexing**
   - Embed note chunks, claims, and normalized claims.
   - Index metadata for search and candidate generation.

6. **Candidate Relationship Generation**
   - Retrieve prior candidate claims using entity/KPI/time filters and embeddings.
   - Deduplicate near-identical claims.

7. **Relationship Classification**
   - LLM classifies relationship with constrained output schema.
   - Require citation to both evidence snippets.
   - Use calibration thresholds and abstain option.

8. **Synthesis Generation**
   - Generate company/theme summaries from selected claims only.
   - Include citations and disagreement sections.
   - Cache and update incrementally.

9. **Notification Decisioning**
   - Score severity and relevance.
   - Apply user/team notification rules.
   - Create alerts and digest entries.

10. **Human Feedback Loop**
   - Analysts confirm/reject claims and relationships.
   - Feedback improves prompts, thresholds, and eventually fine-tuned classifiers.

### Model Strategy

MVP:

- Use strong hosted LLMs for extraction/classification with zero data retention contractual settings.
- Use smaller local or hosted embedding model for retrieval.
- Use deterministic schema validation and retries.

Enterprise/scale:

- Offer customer-managed keys.
- Support private model endpoints such as Azure OpenAI, AWS Bedrock, Vertex AI, or self-hosted models.
- Build evaluation datasets from anonymized or customer-approved examples.

### AI Quality Requirements

- Every extracted claim must include source span evidence.
- Every contradiction must cite both sides.
- System must abstain when relationship is uncertain.
- Generated synthesis must separate facts, claims, and interpretation.
- No uncited investment assertions in outputs.
- User-visible correction path for entity/claim errors.

### Evaluation Metrics

- Claim extraction precision/recall against analyst-labeled notes.
- Entity resolution accuracy.
- Contradiction detection precision at top 5/top 10 alerts.
- Analyst acceptance rate of extracted claims.
- Alert dismissal rate and reasons.
- Time saved per note and per IC prep.
- Number of meaningful cross-analyst connections found.

## 12. Architecture

### High-Level Components

- Web app: notes editor, dashboards, search, alerts, admin.
- API backend: auth, notes, entities, claims, permissions, alerts.
- Ingestion workers: email, file upload, docs, transcripts, news.
- AI orchestration service: extraction, classification, synthesis.
- Retrieval service: hybrid search and permission-filtered RAG.
- Notification service: in-app, email, Slack/Teams.
- Audit/compliance service.
- Admin console.

### Reference Architecture

- Frontend: React/Next.js, TypeScript.
- Backend: Python FastAPI or TypeScript NestJS.
- Database: PostgreSQL + pgvector initially.
- Search: OpenSearch when needed beyond Postgres full-text.
- Queue: Temporal, Celery/RQ, or BullMQ for processing jobs.
- Object storage: S3/GCS/Azure Blob.
- Auth: Auth0/WorkOS/Clerk Enterprise or native OIDC/SAML.
- AI: OpenAI/Azure OpenAI/Anthropic/Bedrock/Vertex via provider abstraction.
- Observability: Datadog/OpenTelemetry/Sentry.
- Infrastructure: AWS preferred for financial services buyers; Terraform; SOC 2-ready controls.

### Permission-Aware Retrieval

All search and AI context assembly must enforce permissions before model calls:

1. Resolve user's accessible note/claim IDs.
2. Retrieve only from accessible source set.
3. Include access metadata in prompt context.
4. Log source IDs sent to model provider.
5. Never allow model-generated answers to reveal inaccessible claims indirectly.

### Multi-Tenancy

MVP can use logical tenant isolation with strong row-level controls. Enterprise should support dedicated database/schema or VPC deployment for larger funds.

## 13. Integrations

### MVP Integrations

- Google/Microsoft SSO.
- Email forwarding ingestion.
- Slack or Microsoft Teams notifications.
- File upload for PDFs, Word docs, text transcripts.
- Basic market entity/security master from public/security data provider.

### Near-Term Integrations

- Google Drive, OneDrive, SharePoint.
- Microsoft Teams/Zoom transcript ingestion.
- Calendar prep from Google Calendar/Microsoft Outlook.
- CRM/RMS imports: Bipsync, Salesforce, Affinity, DealCloud where relevant.
- News APIs: Factiva, Dow Jones, Bloomberg Enterprise Access Point, AlphaSense, Refinitiv, RavenPack, NewsAPI for lower-end pilots.
- Filings: SEC EDGAR, company IR feeds.

### Integration Principles

- Respect licensing. Do not ingest or redistribute licensed content unless customer has rights.
- Preserve source metadata and terms.
- Keep external connector credentials encrypted and auditable.
- Allow customers to disable model processing for specific sources.

## 14. Security, Compliance, and Trust

Investment teams will not adopt this product unless trust is credible from day one.

### Security Baseline

- Encryption in transit and at rest.
- Tenant isolation.
- SSO/SAML/OIDC.
- RBAC and workspace-level permissions.
- Audit logs for access, edits, exports, AI calls, admin changes.
- Secrets management.
- Secure file storage with signed URLs.
- Backups and disaster recovery.
- Vulnerability management and dependency scanning.

### Compliance Needs

- SOC 2 Type I before broad enterprise sales; Type II for scaling.
- GDPR/CCPA readiness where relevant.
- Data retention and deletion controls.
- Legal hold support for enterprise tier.
- Export logs for compliance review.
- Configurable restricted lists.
- MNPI controls:
  - Source type labels.
  - Restricted tags.
  - Access limitations.
  - Warnings when summarizing restricted-source material.
  - Clear statement that product assists workflow but does not determine legal materiality or trading clearance.

### AI/Data Policy

- Customer data not used to train vendor models.
- Vendor zero-retention or enterprise privacy agreements where possible.
- Model call logs include source IDs, prompt template version, provider, and output hash.
- Configurable provider selection.
- Option for private cloud or customer-managed LLM endpoint.
- Human-in-the-loop for material alerts and thesis updates.

### Compliance UX

- Compliance dashboard with recent exports, restricted-tag usage, dismissed alerts, permission changes.
- Review mode for sensitive notes.
- Clear provenance on all AI-generated output.
- Admin controls for external sharing/export.

## 15. Notification Strategy

Notifications must be sparse, relevant, and explainable.

### Notification Channels

- In-app notification center: source of truth.
- Slack/Teams: high-priority alerts and digests.
- Email: daily/weekly digest, compliance summaries.
- Optional mobile push later.

### Alert Types

- New contradiction involving your claim.
- Teammate note agrees with your thesis on a material point.
- External news contradicts/corroborates a claim on a portfolio holding.
- A claim/thesis you follow has become stale.
- You were mentioned or assigned a follow-up.
- Pre-meeting prep available for upcoming meeting.

### Relevance Controls

- Follow companies, sectors, themes, teammates, and portfolio holdings.
- Severity thresholds.
- Quiet hours.
- Digest vs immediate mode.
- Alert suppression for low-confidence AI classifications.
- Team-level defaults set by PM/admin.

### Alert Payload

Each alert should include:

- One-line summary.
- Why it matters.
- Affected company/theme/KPI.
- Source note/news citation.
- Prior claim citation.
- Relationship classification and confidence.
- Suggested action: review, comment, assign follow-up, dismiss, update thesis.

## 16. Success Metrics

### User Engagement

- Weekly active analysts / licensed users.
- Notes ingested per user per week.
- Percentage of notes reviewed with accepted claims.
- Searches/questions per PM per week.
- Company/theme dashboard visits before IC meetings.

### Product Quality

- Claim extraction acceptance rate >70% in pilot.
- Top contradiction alert precision >60% in pilot, >80% target.
- False-positive alert dismissal rate trending down.
- Entity resolution accuracy >95% for portfolio/watchlist names.

### Business Metrics

- Pilot-to-paid conversion.
- Time to first valuable alert.
- Net revenue retention by seat expansion.
- Gross margin after AI processing costs.
- Sales cycle duration by customer type.

### Outcome Metrics

- Analyst-reported prep time reduction.
- Number of material contradictions found before IC/position change.
- PM confidence in team knowledge coverage.
- Reduction in repeated diligence questions.

## 17. Pricing and Packaging

### Starter Pilot

- 5-15 users.
- One workspace.
- Limited integrations.
- Usage cap on notes/model processing.
- White-glove onboarding.

### Team

- Per-seat pricing.
- Slack/Teams, email ingestion, docs integrations.
- Standard security and audit logs.

### Enterprise

- Annual contract.
- SAML/SCIM.
- Dedicated environment or VPC option.
- Customer-managed keys.
- Advanced retention/legal hold.
- Premium news/vendor integrations.
- Compliance exports and admin controls.

Pricing should be value-based and benchmarked against RMS/AlphaSense-like budgets, not commodity note apps. Early pilots can be discounted in exchange for design partner feedback and labeled evaluation data.

## 18. Launch Plan

### Phase 1: Design Partner Discovery

- Interview 15-25 investment professionals.
- Validate top workflows and compliance constraints.
- Collect anonymized sample note formats.
- Define pilot success criteria with 3-5 teams.

### Phase 2: Private Alpha

- Support manual uploads and note editor.
- Run extraction/contradiction pipeline with human review.
- Weekly feedback sessions.
- Measure alert usefulness.

### Phase 3: Paid Pilots

- Add SSO, audit logs, Slack/Teams, email ingestion.
- Onboard 3-5 small funds.
- Tune claim schema by sector.
- Build case studies around discovered contradictions and IC prep time saved.

### Phase 4: General Availability

- SOC 2 Type I.
- Harden admin/compliance controls.
- Add key document/news integrations.
- Publish security whitepaper and buyer materials.
- Shift from founder-led onboarding to repeatable customer success playbook.

## 19. Risks and Mitigations

### Risk: False positives create alert fatigue

Mitigation:

- Conservative thresholds.
- Digest mode by default.
- User feedback on alerts.
- Top-N prioritization.
- Explain classification rationale.

### Risk: False negatives miss important contradictions

Mitigation:

- Track recall on labeled examples.
- Combine semantic and structured retrieval.
- Let users manually compare selected notes.
- Use follow-up suggestions and stale-claim checks.

### Risk: Analysts resist changing workflow

Mitigation:

- Import from existing tools.
- Email-forward and transcript ingestion.
- Fast editor and templates.
- Immediate value from pre-meeting prep and teammate comparisons.

### Risk: Compliance blocks adoption

Mitigation:

- Build audit, permissions, retention, and AI vendor controls early.
- Avoid using customer data for training.
- Offer private deployment path.
- Position as decision support, not compliance or trading advice.

### Risk: Licensed content restrictions

Mitigation:

- Preserve licensing metadata.
- Integrate only where customer has rights.
- Avoid redistributing full third-party content in generated outputs.
- Let customers configure source exclusions.

### Risk: AI cost or latency scales poorly

Mitigation:

- Extract atomic claims once, then reuse.
- Use cheaper models for candidate generation.
- Batch jobs and cache synthesis.
- Tier model quality by task criticality.

### Risk: Hard to prove ROI

Mitigation:

- Track time saved and valuable alerts.
- Build pilot scorecards.
- Tie use cases to IC prep, diligence quality, and avoided misses.

## 20. Open Questions

1. Which initial customer segment has the strongest pain and fastest buying cycle: L/S equity funds, long-only teams, PE/crossover, or family offices?
2. Should the product begin as a standalone note workspace or integrate into existing docs/RMS first?
3. What source types are legally and culturally acceptable for model processing at target funds?
4. How much human review is required before claims enter the shared graph?
5. Which news/data providers are practical for pilots without heavy licensing friction?
6. What level of contradiction precision is necessary for analysts to trust alerts?
7. How should the product handle anonymous expert calls and restricted notes?
8. Should the first vertical schema focus on public equities only or include credit/PE?
9. How much portfolio data should be integrated to prioritize alerts?
10. What is the buyer: PM/CIO, COO/CTO, research head, or compliance?

## 21. Practical MVP Build Sequence

1. Note ingestion and storage.
2. Entity extraction and review UI.
3. Claim extraction with citations.
4. Claim graph storage.
5. Search over notes/claims.
6. Candidate claim matching.
7. Contradiction/agreement classification.
8. Company dashboard.
9. Notifications.
10. External news matching.
11. Admin/compliance hardening.

## 22. Product Principles

- **Citations over confidence.** Every answer must show its work.
- **Sparse alerts win.** One great contradiction alert beats twenty weak ones.
- **Analyst workflow first.** Capture should feel easier than current notes.
- **Private research is sacred.** Permissions and provenance are product features.
- **Disagreement is valuable.** The product should surface uncertainty, not hide it.
- **No black-box investment advice.** It organizes evidence; humans decide.
