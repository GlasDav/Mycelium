import type { Claim, Direction, Horizon, RelationType, SourcePersonContext } from './types';

export interface ClaimConfidenceInput {
  direction: Direction;
  text: string;
  evidence?: string;
  tickers?: string[];
  themes?: string[];
  industries?: string[];
  kpis?: string[];
  companyTags?: string[];
  sourcePeople?: string[];
  observedAt?: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
}

export interface RelationEvidenceInput {
  a: Pick<Claim, 'confidence'>;
  b: Pick<Claim, 'confidence'>;
  relationType: RelationType;
  matchScore: number;
  overlapDays: number;
  compatible: boolean;
  sourcePersonContext?: SourcePersonContext;
  observationGapDays: number;
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function roundConfidence(value: number): number {
  return Math.round(clampConfidence(value) * 100) / 100;
}

export function scoreClaimConfidence(input: ClaimConfidenceInput): number {
  let score = 0.4;
  score += input.direction === 'neutral' ? 0.04 : 0.12;
  score += wordCount(`${input.text} ${input.evidence ?? ''}`) >= 6 ? 0.05 : 0.02;
  if (hasItems(input.tickers)) score += 0.08;
  if (hasItems(input.companyTags)) score += 0.04;
  if (hasItems(input.kpis)) score += 0.07;
  if (hasItems(input.themes)) score += 0.04;
  if (hasItems(input.industries)) score += 0.04;
  if (hasItems(input.sourcePeople)) score += 0.05;
  if (input.observedAt) score += 0.03;
  if (input.appliesToStart) score += 0.03;
  if (input.appliesToEnd) score += 0.03;
  if (input.horizon && input.horizon !== 'unknown') score += 0.03;
  return roundConfidence(score);
}

export function scoreRelationEvidence(input: RelationEvidenceInput): number {
  const endpointConfidence = (clampConfidence(input.a.confidence) + clampConfidence(input.b.confidence)) / 2;
  let score = 0.28 + endpointConfidence * 0.25;
  score += Math.min(0.22, Math.max(0, input.matchScore) * 0.035);
  score += relationTypeWeight(input.relationType);
  score += temporalEvidenceWeight(input);
  score += sourcePersonWeight(input.sourcePersonContext);
  return roundConfidence(score);
}

function relationTypeWeight(type: RelationType): number {
  return ({
    contradiction: 0.08,
    update_or_trend_reversal: 0.05,
    historical_tension: 0.03,
    open_tension: 0.03,
    corroboration: 0.06,
    agreement: 0.03,
    stale_evidence: -0.03
  })[type];
}

function temporalEvidenceWeight(input: RelationEvidenceInput): number {
  if (input.relationType === 'contradiction' && input.overlapDays >= 30) return 0.14;
  if (input.relationType === 'update_or_trend_reversal' && input.observationGapDays >= 120) return 0.1;
  if (input.relationType === 'corroboration' && input.compatible) return 0.1;
  if (input.relationType === 'agreement' && input.compatible) return 0.06;
  if (input.relationType === 'historical_tension' && input.overlapDays > 0) return 0.04;
  if (input.relationType === 'open_tension') return 0.03;
  return 0;
}

function sourcePersonWeight(context?: SourcePersonContext): number {
  if (context === 'same_source_person') return 0.07;
  if (context === 'different_source_people') return 0.03;
  return 0;
}

function hasItems(values?: string[]): boolean {
  return Boolean(values?.some(value => value.trim()));
}

function wordCount(text: string): number {
  return text.match(/[a-z0-9]+/gi)?.length ?? 0;
}
