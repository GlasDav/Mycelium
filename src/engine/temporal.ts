import type { Claim, ClaimWindowStatus, Freshness, Horizon, Note } from './types';
import { addDays, DAY, daysBetween } from './utils';

export function inferTemporalWindow(note: Note, sentence: string, asOf: string): Pick<Claim, 'observedAt' | 'appliesToStart' | 'appliesToEnd' | 'horizon'> {
  const observedAt = note.observedAt ?? note.createdAt;
  const horizon = note.horizon ?? inferHorizon(sentence, note.sourceType);
  const start = note.appliesToStart ?? observedAt;
  const end = note.appliesToEnd ?? addDays(start, horizonDays(horizon));
  return { observedAt, appliesToStart: start, appliesToEnd: end, horizon };
}

export function claimObservedBy(claim: Claim, asOf: string): boolean {
  return Date.parse(claim.observedAt) <= Date.parse(asOf);
}

export function effectiveClaimEnd(claim: Pick<Claim, 'appliesToStart' | 'appliesToEnd' | 'horizon'>): string {
  return claim.appliesToEnd ?? addDays(claim.appliesToStart, horizonDays(claim.horizon));
}

export function freshnessAsOf(claim: Pick<Claim, 'appliesToStart' | 'appliesToEnd' | 'horizon'>, asOf: string): Freshness {
  return freshnessFor(effectiveClaimEnd(claim), asOf);
}

export function projectClaimAsOf<T extends Claim>(claim: T, asOf: string): T {
  return {
    ...claim,
    freshness: freshnessAsOf(claim, asOf)
  };
}

export function claimWindowStatus(claim: Pick<Claim, 'appliesToStart' | 'appliesToEnd' | 'horizon'>, asOf: string): ClaimWindowStatus {
  if (Date.parse(asOf) < Date.parse(claim.appliesToStart)) return 'future';
  if (Date.parse(asOf) <= Date.parse(effectiveClaimEnd(claim))) return 'active';
  return 'expired';
}

export function horizonDays(horizon: Horizon): number {
  return ({ point_in_time: 14, near_term: 90, quarter: 120, year: 365, unknown: 180 })[horizon];
}

export function windowsCompatible(a: Claim, b: Claim): boolean {
  return windowOverlapDays(a, b) >= 15 || Math.abs(daysBetween(a.observedAt, b.observedAt)) <= 45;
}

export function windowOverlapDays(a: Claim, b: Claim): number {
  const start = Math.max(Date.parse(a.appliesToStart), Date.parse(b.appliesToStart));
  const end = Math.min(Date.parse(a.appliesToEnd ?? addDays(a.appliesToStart, horizonDays(a.horizon))), Date.parse(b.appliesToEnd ?? addDays(b.appliesToStart, horizonDays(b.horizon))));
  return Math.max(0, Math.round((end - start) / DAY));
}

export function freshnessFor(windowEnd: string, asOf: string): Freshness {
  const age = daysBetween(windowEnd, asOf);
  if (age <= 30) return 'fresh';
  if (age <= 180) return 'aging';
  return 'stale';
}

export function isStale(claim: Claim, asOf: string): boolean {
  return claim.freshness === 'stale' || daysBetween(claim.appliesToEnd ?? claim.observedAt, asOf) > 180;
}

export function formatWindow(c: Claim): string {
  return `${c.appliesToStart}â€“${c.appliesToEnd ?? 'open'} (${c.horizon}, ${c.freshness})`;
}

function inferHorizon(sentence: string, sourceType: string): Horizon {
  const lower = `${sentence} ${sourceType}`.toLowerCase();
  if (/today|spot|current|channel check|dealer|supplier/.test(lower)) return 'near_term';
  if (/q[1-4]|quarter|90 day/.test(lower)) return 'quarter';
  if (/year|12 month|fy\d{2}|annual/.test(lower)) return 'year';
  return 'near_term';
}
