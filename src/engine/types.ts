import type { LinkedEntity } from '../entity-links';

export type Visibility = 'public' | 'team' | 'private';
export type AccessScope = 'organization' | 'team' | 'personal';
export type Role = 'Analyst' | 'PM' | 'Compliance' | 'Guest';
export type OrgRole = 'admin' | 'member';
export type UserStatus = 'active' | 'deactivated';
export type TeamStatus = 'active' | 'archived';
export type Direction = 'positive' | 'negative' | 'neutral';
export type Horizon = 'point_in_time' | 'near_term' | 'quarter' | 'year' | 'unknown';
export type Freshness = 'fresh' | 'aging' | 'stale';
export type RelationType = 'contradiction' | 'update_or_trend_reversal' | 'historical_tension' | 'open_tension' | 'corroboration' | 'agreement' | 'stale_evidence';
export type SourcePersonContext = 'same_source_person' | 'different_source_people' | 'unknown';
export type ClaimWindowStatus = 'future' | 'active' | 'expired';
export type ExternalSourceKind = 'news' | 'filing' | 'press_release' | 'transcript' | 'other';

export interface TranscriptCitation {
  chunkId: string;
  importJobId: string;
  chunkIndex: number;
  startMs?: number;
  endMs?: number;
  speaker?: string;
  text: string;
  confidence?: number;
}

export interface TeamMembership {
  teamId: string;
  teamName: string;
  role: string;
  status?: TeamStatus;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  team: string;
  teamId?: string;
  primaryTeamId?: string;
  orgRole?: OrgRole;
  status?: UserStatus;
  teamMemberships?: TeamMembership[];
}

export interface Note {
  id: string;
  title: string;
  body: string;
  authorId: string;
  team?: string;
  teamId?: string;
  visibility: Visibility;
  accessScope?: AccessScope;
  sourceType: string;
  createdAt: string;
  observedAt?: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
  industries?: string[];
  companyTags?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  linkedEntities?: LinkedEntity[];
}

export interface Entity {
  name: string;
  kind: 'company' | 'ticker' | 'industry' | 'theme' | 'kpi' | 'watchlist' | 'source_person';
  ticker?: string;
}

export interface Claim {
  id: string;
  noteId: string;
  subject: string;
  text: string;
  direction: Direction;
  evidence: string;
  confidence: number;
  themes: string[];
  tickers?: string[];
  industries?: string[];
  companyTags?: string[];
  kpis?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  linkedEntities?: LinkedEntity[];
  createdAt: string;
  observedAt: string;
  appliesToStart: string;
  appliesToEnd?: string;
  horizon: Horizon;
  freshness: Freshness;
  authorId: string;
  visibility: Visibility;
  accessScope?: AccessScope;
  team?: string;
  teamId?: string;
  transcriptCitations?: TranscriptCitation[];
}

export interface ExternalEvidenceItem {
  id: string;
  title: string;
  summary: string;
  sourceKind: ExternalSourceKind;
  sourceUrl?: string;
  sourceId?: string;
  provider?: string;
  publishedAt: string;
  observedAt: string;
  authorId: string;
  visibility: Visibility;
  accessScope: AccessScope;
  team?: string;
  teamId?: string;
  linkedEntities?: LinkedEntity[];
  tickers?: string[];
  industries?: string[];
  companyTags?: string[];
  kpis?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  licenseMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalEvent {
  id: string;
  evidenceItemId: string;
  subject: string;
  text: string;
  direction: Direction;
  evidence: string;
  confidence: number;
  observedAt: string;
  linkedEntities?: LinkedEntity[];
  tickers?: string[];
  industries?: string[];
  companyTags?: string[];
  kpis?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
}

export interface Relation {
  id: string;
  type: RelationType;
  a: Claim;
  b: Claim;
  reason: string;
  score: number;
  overlapDays: number;
  sourcePersonContext?: SourcePersonContext;
}

export interface Alert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  relation?: Relation;
  company?: string;
}

export interface PersonMemorySummary {
  name: string;
  claimCount: number;
  positives: number;
  negatives: number;
  neutrals: number;
  latestClaimId: string;
  latestObservedAt: string;
  latestDirection: Direction;
  subjects: string[];
  contradictions: number;
  trendReversals: number;
  tensions: number;
  latestClaims: Claim[];
}
