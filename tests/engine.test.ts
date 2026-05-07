import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, classifyTemporalRelation, detectEntities, detectRelations, extractClaims, inferTemporalWindow, runPipeline, type Claim, type Note, type User } from '../src/engine';

const analyst: User = { id: 'a', name: 'Analyst', role: 'Analyst', team: 'Semis' };
const pm: User = { id: 'p', name: 'PM', role: 'PM', team: 'Portfolio' };
const base = { authorId: 'a', team: 'Semis', visibility: 'team' as const, sourceType: 'call', createdAt: '2026-05-01', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-01', horizon: 'near_term' as const };

function claim(overrides: Partial<Claim>): Claim {
  return {
    id: 'claim',
    noteId: 'note',
    subject: 'Nvidia',
    text: 'Nvidia demand is strong and GPU supply is tight.',
    direction: 'positive',
    evidence: 'Nvidia demand is strong and GPU supply is tight.',
    confidence: 0.8,
    themes: ['AI infrastructure'],
    createdAt: '2026-05-01',
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-29',
    horizon: 'quarter',
    freshness: 'fresh',
    authorId: 'a',
    visibility: 'team',
    team: 'Semis',
    ...overrides
  };
}

test('extracts entities, claims, and temporal metadata from investment notes', () => {
  const note: Note = { ...base, id: 'n1', title: 'note', body: 'Nvidia demand is strong and GPU supply is tight. Apple iPhone demand is soft.' };
  const entities = detectEntities(note.body);
  assert(entities.some(e => e.name === 'Nvidia' && e.kind === 'company'));
  assert(entities.some(e => e.name === 'NVDA' && e.kind === 'ticker'));
  const claims = extractClaims(note, '2026-05-03');
  assert.equal(claims.length, 2);
  assert.equal(claims[0].direction, 'positive');
  assert.equal(claims[1].direction, 'negative');
  assert.equal(claims[0].observedAt, '2026-05-01');
  assert.equal(claims[0].appliesToStart, '2026-05-01');
  assert.equal(claims[0].appliesToEnd, '2026-08-01');
  assert.equal(claims[0].freshness, 'fresh');
});

test('permission model hides other-team restricted notes from analysts', () => {
  const hidden: Note = { ...base, id: 'n2', title: 'hidden', team: 'Consumer', authorId: 'other', body: 'Apple demand is weak.' };
  assert.equal(canAccess(analyst, hidden), false);
  assert.equal(canAccess(pm, hidden), true);
});

test('overlapping opposing claims are true contradictions', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
    { ...base, id: 'n2', title: 'bear', body: 'Nvidia demand is weak as GPU supply slows.' }
  ];
  const graph = runPipeline(notes, analyst);
  const contradiction = graph.relations.find(r => r.type === 'contradiction');
  assert(contradiction);
  assert(contradiction.overlapDays >= 30);
  assert(graph.alerts.some(a => a.severity === 'high'));
});

test('non-overlapping opposing claims twelve months apart are trend reversals, not contradictions', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'old bear', createdAt: '2025-05-01', observedAt: '2025-05-01', appliesToStart: '2025-05-01', appliesToEnd: '2025-07-31', body: 'Nvidia demand is weak as GPU supply growth slows.' },
    { ...base, id: 'n2', title: 'new bull', createdAt: '2026-05-01', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-01', body: 'Nvidia demand is strong and GPU supply is tight.' }
  ];
  const graph = runPipeline(notes, analyst);
  assert(graph.relations.some(r => r.type === 'update_or_trend_reversal'));
  assert(!graph.relations.some(r => r.type === 'contradiction'));
});

test('old aligned claim becomes stale evidence beside a newer read', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'old bull', createdAt: '2025-01-01', observedAt: '2025-01-01', appliesToStart: '2025-01-01', appliesToEnd: '2025-03-31', body: 'Nvidia demand is strong and GPU supply is tight.' },
    { ...base, id: 'n2', title: 'new bull', createdAt: '2026-05-01', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-01', body: 'Nvidia demand is strong and GPU supply is tight.' }
  ];
  const graph = runPipeline(notes, analyst);
  assert(graph.claims.some(c => c.noteId === 'n1' && c.freshness === 'stale'));
  assert(graph.relations.some(r => r.type === 'stale_evidence'));
});

test('permission filtering still applies to temporal relation graph', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'visible bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
    { ...base, id: 'n2', title: 'hidden bear', team: 'Consumer', authorId: 'other', body: 'Nvidia demand is weak as GPU supply slows.' }
  ];
  const analystGraph = runPipeline(notes, analyst);
  const pmGraph = runPipeline(notes, pm);
  assert.equal(analystGraph.claims.length, 1);
  assert.equal(analystGraph.relations.length, 0);
  assert(pmGraph.relations.some(r => r.type === 'contradiction'));
});

test('temporal helper infers quarter windows from quarter language', () => {
  const note: Note = { ...base, id: 'n3', title: 'quarter read', body: 'Nvidia demand should improve through Q3.', appliesToEnd: undefined, horizon: undefined };
  const temporal = inferTemporalWindow(note, 'Nvidia demand should improve through Q3.', '2026-05-01');
  assert.equal(temporal.horizon, 'quarter');
  assert.equal(temporal.appliesToStart, '2026-05-01');
  assert.equal(temporal.appliesToEnd, '2026-08-29');
});

test('temporal helper keeps observed date while defaulting applies-to start to observed date', () => {
  const note: Note = { ...base, id: 'n4', title: 'observed read', body: 'Nvidia demand is strong.', createdAt: '2026-05-07', observedAt: '2026-04-15', appliesToStart: undefined, appliesToEnd: undefined, horizon: undefined };
  const temporal = inferTemporalWindow(note, 'Nvidia demand is strong.', '2026-05-07');
  assert.equal(temporal.observedAt, '2026-04-15');
  assert.equal(temporal.appliesToStart, '2026-04-15');
  assert.equal(temporal.appliesToEnd, '2026-07-14');
});

test('temporal relation helper separates overlapping contradictions from stale separated evidence', () => {
  const overlappingBear = claim({ id: 'bear-overlap', noteId: 'bear-note', direction: 'negative', text: 'Nvidia demand is weak as GPU supply slows.', appliesToStart: '2026-06-01', appliesToEnd: '2026-09-29', observedAt: '2026-06-01' });
  const currentBull = claim({ id: 'bull-current', noteId: 'bull-note', direction: 'positive', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-29' });
  const contradiction = classifyTemporalRelation(currentBull, overlappingBear, 4, '2026-06-01');
  assert.equal(contradiction?.type, 'contradiction');
  assert.equal(contradiction?.overlapDays, 89);

  const staleBull = claim({ id: 'bull-stale', noteId: 'stale-note', observedAt: '2025-01-01', appliesToStart: '2025-01-01', appliesToEnd: '2025-03-31', freshness: 'stale' });
  const freshBull = claim({ id: 'bull-fresh', noteId: 'fresh-note', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-29', freshness: 'fresh' });
  const staleEvidence = classifyTemporalRelation(staleBull, freshBull, 4, '2026-05-01');
  assert.equal(staleEvidence?.type, 'stale_evidence');
  assert.equal(staleEvidence?.overlapDays, 0);
});
