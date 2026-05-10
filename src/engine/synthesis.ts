import { sourcePeopleForClaim } from './metadata';
import type { Claim, Direction, PersonMemorySummary, Relation } from './types';
import { tally, uniqueBy } from './utils';

export function synthesize(claims: Claim[], relations: Relation[], subject: string) {
  const scoped = claims.filter(c => c.subject === subject || c.themes.includes(subject));
  const current = scoped.filter(c => c.freshness !== 'stale');
  const historical = scoped.filter(c => c.freshness === 'stale');
  const positives = current.filter(c => c.direction === 'positive').length;
  const negatives = current.filter(c => c.direction === 'negative').length;
  const historicalPositives = historical.filter(c => c.direction === 'positive').length;
  const historicalNegatives = historical.filter(c => c.direction === 'negative').length;
  const relevantRelations = relations.filter(r => r.a.subject === subject || r.a.themes.includes(subject));
  const contradictions = relevantRelations.filter(r => r.type === 'contradiction').length;
  const tensions = relevantRelations.filter(r => r.type === 'historical_tension' || r.type === 'open_tension').length;
  const updates = relevantRelations.filter(r => r.type === 'update_or_trend_reversal').length;
  const staleEvidence = relevantRelations.filter(r => r.type === 'stale_evidence').length + historical.length;
  const stance = positives > negatives ? 'constructive' : negatives > positives ? 'cautious' : 'mixed';
  const topThemes = tally(scoped.flatMap(c => c.themes)).slice(0, 4).map(x => x[0]);
  return { subject, stance, positives, negatives, historicalPositives, historicalNegatives, total: scoped.length, currentTotal: current.length, historicalTotal: historical.length, contradictions, tensions, updates, staleEvidence, topThemes, summary: `${subject} current view reads ${stance}: ${positives} supportive and ${negatives} skeptical fresh claims. Historical evidence adds ${historical.length} older claim${historical.length === 1 ? '' : 's'}; ${updates} trend reversal${updates === 1 ? '' : 's'} and ${contradictions} true contradiction${contradictions === 1 ? '' : 's'} are visible.` };
}

export function buildPersonMemory(claims: Claim[], relations: Relation[]): PersonMemorySummary[] {
  const byPerson = new Map<string, Claim[]>();
  for (const claim of claims) {
    for (const person of sourcePeopleForClaim(claim)) {
      byPerson.set(person, [...(byPerson.get(person) ?? []), claim]);
    }
  }

  return [...byPerson.entries()].map(([name, personClaims]) => {
    const sortedClaims = [...personClaims].sort((a, b) => compareClaimDates(a, b));
    const latest = sortedClaims[sortedClaims.length - 1];
    const personRelations = relations.filter(relation => {
      const aPeople = sourcePeopleForClaim(relation.a);
      const bPeople = sourcePeopleForClaim(relation.b);
      return aPeople.includes(name) && bPeople.includes(name);
    });

    return {
      name,
      claimCount: sortedClaims.length,
      positives: sortedClaims.filter(claim => claim.direction === 'positive').length,
      negatives: sortedClaims.filter(claim => claim.direction === 'negative').length,
      neutrals: sortedClaims.filter(claim => claim.direction === 'neutral').length,
      latestClaimId: latest.id,
      latestObservedAt: latest.observedAt,
      latestDirection: latest.direction as Direction,
      subjects: sortedUnique(sortedClaims.map(claim => claim.subject)),
      contradictions: personRelations.filter(relation => relation.type === 'contradiction').length,
      trendReversals: personRelations.filter(relation => relation.type === 'update_or_trend_reversal').length,
      tensions: personRelations.filter(relation => relation.type === 'historical_tension' || relation.type === 'open_tension').length,
      latestClaims: sortedClaims.slice(-3).reverse()
    };
  }).sort((a, b) => b.latestObservedAt.localeCompare(a.latestObservedAt) || a.name.localeCompare(b.name));
}

function compareClaimDates(a: Claim, b: Claim): number {
  return a.observedAt.localeCompare(b.observedAt)
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

function sortedUnique(values: string[]): string[] {
  return uniqueBy(values.map(value => value.trim()).filter(Boolean), value => value.toLowerCase()).sort((a, b) => a.localeCompare(b));
}
