export type {
  AccessScope,
  Alert,
  Claim,
  ClaimWindowStatus,
  Direction,
  Entity,
  ExternalEvent,
  ExternalEvidenceItem,
  ExternalSourceKind,
  Freshness,
  Horizon,
  Note,
  OrgRole,
  PersonMemorySummary,
  Relation,
  RelationType,
  Role,
  SourcePersonContext,
  TeamMembership,
  TranscriptCitation,
  TeamStatus,
  User,
  UserStatus,
  Visibility
} from './engine/types';
export { accessScopeFromVisibility, canAccess, userTeamMemberships, visibilityFromAccessScope } from './engine/access';
export { generateAlerts } from './engine/alerts';
export { buildClaims, directionFor, extractClaims } from './engine/claim-extraction';
export type { ClaimExtractionContext, ClaimExtractionDraft, ClaimExtractionProvider } from './engine/extraction-provider';
export { createFallbackClaimExtractionProvider, deterministicClaimExtractionProvider } from './engine/extraction-provider';
export { detectEntities } from './engine/entity-extraction';
export { companyLexicon, kpiWords, themeLexicon } from './engine/lexicon';
export { classifyTemporalRelation, detectRelations, relationLabel } from './engine/relation-classification';
export { buildPersonMemory, synthesize } from './engine/synthesis';
export {
  claimObservedBy,
  claimWindowStatus,
  effectiveClaimEnd,
  freshnessAsOf,
  inferTemporalWindow,
  projectClaimAsOf
} from './engine/temporal';
export { runPipeline } from './engine/pipeline';
