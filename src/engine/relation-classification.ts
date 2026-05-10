import { sourcePeopleForClaim } from './metadata';
import {
  deterministicCandidateRetriever,
  type CandidateRetriever
} from './relation-candidates';
import { formatWindow, isStale, windowOverlapDays, windowsCompatible } from './temporal';
import type { Claim, Relation, RelationType, SourcePersonContext } from './types';
import { daysBetween, maxDate, overlapKeywords, relationIdForClaims } from './utils';

export function detectRelations(
  claims: Claim[],
  asOf = maxDate(claims.map(c => c.observedAt)),
  candidateRetriever: CandidateRetriever = deterministicCandidateRetriever
): Relation[] {
  const relations: Relation[] = [];
  for (const candidate of candidateRetriever.retrieve(claims, { asOf })) {
    const classificationScore = candidate.classificationScore ?? candidate.sharedWords + candidate.sharedMetadata;
    const relation = classifyTemporalRelation(candidate.a, candidate.b, classificationScore, asOf);
    if (relation) relations.push(relation);
  }
  return relations.sort((a,b) => b.score - a.score);
}

export function classifyTemporalRelation(a: Claim, b: Claim, sharedWords = overlapKeywords(a.text, b.text), asOf = maxDate([a.observedAt, b.observedAt])): Relation | null {
  const opposing = a.direction !== 'neutral' && b.direction !== 'neutral' && a.direction !== b.direction;
  const aligned = a.direction === b.direction && a.direction !== 'neutral';
  if (!opposing && !aligned) return null;

  const overlapDays = windowOverlapDays(a, b);
  const compatible = windowsCompatible(a, b);
  const older = Date.parse(a.observedAt) <= Date.parse(b.observedAt) ? a : b;
  const newer = older === a ? b : a;
  const observationGap = Math.abs(daysBetween(a.observedAt, b.observedAt));
  const id = relationIdForClaims(a, b);
  const baseScore = 0.6 + Math.min(0.24, sharedWords / 24);
  const sourcePersonContext = classifySourcePersonContext(a, b);

  // True contradictions require opposing claims about the same topic whose valid decision windows materially overlap.
  if (opposing && overlapDays >= 30) {
    return { id, type: 'contradiction', a, b, overlapDays, sourcePersonContext, reason: `Opposing ${a.subject} claims overlap for ${overlapDays} days (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore + 0.16 };
  }

  // If windows do not overlap and the later observation reverses the older one, the map should read this as time-series change, not bad data.
  if (opposing && overlapDays === 0 && observationGap >= 120) {
    return { id, type: 'update_or_trend_reversal', a: older, b: newer, overlapDays, sourcePersonContext, reason: `Newer claim reverses an older read after ${observationGap} days, with non-overlapping windows (${formatWindow(older)} â†’ ${formatWindow(newer)}).`, score: baseScore + 0.1 };
  }

  // Short gaps, broad horizons, and tiny overlaps are ambiguous enough to keep in the tension bucket for analyst review.
  if (opposing) {
    const type: RelationType = overlapDays > 0 ? 'historical_tension' : 'open_tension';
    return { id, type, a, b, overlapDays, sourcePersonContext, reason: `Opposing reads have ${overlapDays ? `only ${overlapDays} days of overlap` : 'no material overlap'} and ambiguous horizon/date context (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore };
  }

  if (aligned && compatible) {
    return { id, type: 'corroboration', a, b, overlapDays, sourcePersonContext, reason: `Aligned ${a.subject} claims share compatible windows (${formatWindow(a)} and ${formatWindow(b)}).`, score: baseScore + 0.08 };
  }

  if (aligned && isStale(older, asOf)) {
    return { id, type: 'stale_evidence', a: older, b: newer, overlapDays, sourcePersonContext, reason: `Older aligned evidence is stale as of ${asOf}: ${formatWindow(older)} is no longer likely decision-useful beside ${formatWindow(newer)}.`, score: baseScore - 0.08 };
  }

  if (aligned) {
    return { id, type: 'agreement', a, b, overlapDays, sourcePersonContext, reason: `Aligned claims reinforce the same direction, but date windows are separated (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore };
  }
  return null;
}

export function relationLabel(type: RelationType): string {
  return ({
    contradiction: 'True contradiction',
    update_or_trend_reversal: 'Update / trend reversal',
    historical_tension: 'Historical tension',
    open_tension: 'Possible contradiction',
    corroboration: 'Corroboration',
    agreement: 'Agreement',
    stale_evidence: 'Stale evidence'
  })[type];
}

export function relationTitle(r: Relation): string {
  return `${relationLabel(r.type)} on ${r.a.subject}`;
}

function classifySourcePersonContext(a: Claim, b: Claim): SourcePersonContext {
  const aPeople = sourcePeopleForClaim(a);
  const bPeople = sourcePeopleForClaim(b);
  if (!aPeople.length || !bPeople.length) return 'unknown';
  return intersects(aPeople, bPeople) ? 'same_source_person' : 'different_source_people';
}

function intersects(a: string[], b: string[]): boolean {
  return intersectionCount(a, b) > 0;
}

function intersectionCount(a: string[], b: string[]): number {
  const right = new Set(b.map(value => value.toLowerCase()));
  return a.filter(value => right.has(value.toLowerCase())).length;
}
