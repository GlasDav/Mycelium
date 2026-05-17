import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonMemory,
  canAccess,
  claimObservedBy,
  claimWindowStatus,
  classifyTemporalRelation,
  detectEntities,
  detectRelations,
  effectiveClaimEnd,
  extractClaims,
  createFallbackClaimExtractionProvider,
  deterministicClaimExtractionProvider,
  freshnessAsOf,
  inferTemporalWindow,
  projectClaimAsOf,
  runPipeline,
  type Claim,
  type Note,
  type User
} from '../src/engine';
import { linkedEntity } from '../src/entity-links';
import {
  deterministicCandidateRetriever,
  relationCandidates,
  type CandidateRetriever
} from '../src/engine/relation-candidates';
import {
  roundConfidence,
  scoreClaimConfidence,
  scoreRelationEvidence
} from '../src/engine/confidence';

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

test('fallback claim extraction provider without a primary matches deterministic extraction', async () => {
  const note: Note = { ...base, id: 'provider-deterministic', title: 'provider deterministic', body: 'Nvidia demand is strong and GPU supply is tight.' };
  const provider = createFallbackClaimExtractionProvider();

  const claims = await provider.extractClaims(note, { asOf: '2026-05-03' });

  assert.deepEqual(claims, await deterministicClaimExtractionProvider.extractClaims(note, { asOf: '2026-05-03' }));
  assert.deepEqual(claims, extractClaims(note, '2026-05-03'));
});

test('fallback claim extraction provider normalizes primary drafts into complete claims', async () => {
  const note: Note = {
    ...base,
    id: 'provider-draft',
    title: 'provider draft',
    body: 'Nvidia demand is strong and GPU supply is tight.',
    appliesToEnd: undefined,
    horizon: undefined,
    linkedEntities: [linkedEntity('source_person', 'source_person', 'Dana Lee')]
  };
  const provider = createFallbackClaimExtractionProvider({
    async extractClaims() {
      return [{ subject: 'Nvidia', text: 'Nvidia Blackwell demand is strong into Q3.' }];
    }
  });

  const [claim] = await provider.extractClaims(note, { asOf: '2026-05-03' });

  assert.equal(claim.id, 'provider-draft-nvidia-0');
  assert.equal(claim.noteId, note.id);
  assert.equal(claim.subject, 'Nvidia');
  assert.equal(claim.direction, 'positive');
  assert.equal(claim.evidence, 'Nvidia Blackwell demand is strong into Q3.');
  assert.equal(claim.horizon, 'quarter');
  assert.equal(claim.appliesToStart, '2026-05-01');
  assert.equal(claim.freshness, 'fresh');
  assert(claim.confidence > 0);
  assert.deepEqual(claim.tickers, ['NVDA']);
  assert.deepEqual(claim.companyTags, ['Nvidia']);
  assert.deepEqual(claim.sourcePeople, ['Dana Lee']);
  assert(claim.linkedEntities?.some(entity => entity.role === 'subject' && entity.name === 'Nvidia'));
});

test('fallback claim extraction provider falls back when primary throws', async () => {
  const note: Note = { ...base, id: 'provider-throws', title: 'provider throws', body: 'Nvidia demand is strong and GPU supply is tight.' };
  const provider = createFallbackClaimExtractionProvider({
    async extractClaims() {
      throw new Error('provider unavailable');
    }
  });

  assert.deepEqual(await provider.extractClaims(note, { asOf: '2026-05-03' }), extractClaims(note, '2026-05-03'));
});

test('fallback claim extraction provider falls back when primary output is malformed or empty', async () => {
  const note: Note = { ...base, id: 'provider-malformed', title: 'provider malformed', body: 'Nvidia demand is strong and GPU supply is tight.' };
  const emptyProvider = createFallbackClaimExtractionProvider({
    async extractClaims() {
      return [];
    }
  });
  const malformedProvider = createFallbackClaimExtractionProvider({
    async extractClaims() {
      return [{ subject: 'Nvidia' } as any];
    }
  });

  assert.deepEqual(await emptyProvider.extractClaims(note, { asOf: '2026-05-03' }), extractClaims(note, '2026-05-03'));
  assert.deepEqual(await malformedProvider.extractClaims(note, { asOf: '2026-05-03' }), extractClaims(note, '2026-05-03'));
});

test('confidence helpers bound scores and reward richer claim evidence', () => {
  const sparse = scoreClaimConfidence({
    direction: 'neutral',
    text: 'Nvidia revenue.',
    evidence: 'Nvidia revenue.',
    tickers: [],
    themes: [],
    industries: [],
    kpis: [],
    companyTags: [],
    sourcePeople: [],
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    horizon: 'unknown'
  });
  const rich = scoreClaimConfidence({
    direction: 'positive',
    text: 'Nvidia demand is strong and GPU supply is tight.',
    evidence: 'Nvidia demand is strong and GPU supply is tight.',
    tickers: ['NVDA'],
    themes: ['AI infrastructure'],
    industries: ['Semiconductors'],
    kpis: ['demand'],
    companyTags: ['Nvidia'],
    sourcePeople: ['Dana Lee'],
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-01',
    horizon: 'quarter'
  });

  assert.equal(roundConfidence(1.239), 1);
  assert.equal(roundConfidence(-0.2), 0);
  assert(rich > sparse);
  assert(rich <= 1);
  assert(sparse >= 0);
  assert((rich.toString().split('.')[1]?.length ?? 0) <= 2);
});

test('relation evidence scoring rewards stronger evidence without changing relation labels', () => {
  const weak = scoreRelationEvidence({
    a: claim({ confidence: 0.52, sourcePeople: [] }),
    b: claim({ confidence: 0.58, direction: 'negative', sourcePeople: [] }),
    relationType: 'open_tension',
    matchScore: 1,
    overlapDays: 0,
    compatible: false,
    sourcePersonContext: 'unknown',
    observationGapDays: 20
  });
  const strong = scoreRelationEvidence({
    a: claim({ confidence: 0.92, sourcePeople: ['Dana Lee'] }),
    b: claim({ confidence: 0.9, direction: 'negative', sourcePeople: ['Dana Lee'] }),
    relationType: 'contradiction',
    matchScore: 8,
    overlapDays: 120,
    compatible: true,
    sourcePersonContext: 'same_source_person',
    observationGapDays: 12
  });

  assert(strong > weak);
  assert(strong <= 1);
  assert(weak >= 0);
});

test('entity extraction recognizes ontology aliases and industry hierarchy terms', () => {
  const entities = detectEntities('NVIDIA Corporation semis checks show Blackwell demand remains strong.');

  assert(entities.some(e => e.name === 'Nvidia' && e.kind === 'company'));
  assert(entities.some(e => e.name === 'NVDA' && e.kind === 'ticker'));
  assert(entities.some(e => e.name === 'Semiconductors' && e.kind === 'industry'));
});

test('extracted claims include ontology-derived company, industry, and watchlist metadata', () => {
  const note: Note = {
    ...base,
    id: 'ontology-derived',
    title: 'ontology derived',
    body: 'NVIDIA Corporation semis demand is strong.'
  };

  const [claim] = extractClaims(note, '2026-05-03');

  assert.deepEqual(claim.tickers, ['NVDA']);
  assert.deepEqual(claim.companyTags, ['Nvidia']);
  assert.deepEqual(claim.industries, ['Information Technology', 'Semiconductors']);
  assert.deepEqual(claim.watchlistTags, ['AI Capex']);
});

test('extracted claims inherit linked note metadata and source people', () => {
  const note: Note = {
    ...base,
    id: 'n-linked',
    title: 'linked note',
    body: 'Nvidia demand is strong and GPU supply is tight.',
    linkedEntities: [
      linkedEntity('security', 'security', 'NVDA', { ticker: 'NVDA' }),
      linkedEntity('industry', 'industry', 'Semiconductors'),
      linkedEntity('theme', 'theme', 'AI infrastructure'),
      linkedEntity('kpi', 'kpi', 'Demand'),
      linkedEntity('watchlist', 'watchlist', 'AI Capex'),
      linkedEntity('source_person', 'source_person', 'Dana Lee')
    ]
  };

  const [claim] = extractClaims(note, '2026-05-03');

  assert.deepEqual(claim.tickers, ['NVDA']);
  assert.deepEqual(claim.industries, ['Information Technology', 'Semiconductors']);
  assert.deepEqual(claim.kpis, ['Demand', 'supply']);
  assert.deepEqual(claim.watchlistTags, ['AI Capex']);
  assert.deepEqual(claim.sourcePeople, ['Dana Lee']);
  assert(claim.linkedEntities?.some(entity => entity.role === 'subject' && entity.name === 'Nvidia'));
  assert(claim.linkedEntities?.some(entity => entity.role === 'source_person' && entity.name === 'Dana Lee'));
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

test('claim as-of helpers use known-by dates and preserve known future forecasts', () => {
  const futureObserved = claim({
    id: 'future-observed',
    noteId: 'future-note',
    observedAt: '2026-06-01',
    appliesToStart: '2026-06-01',
    appliesToEnd: '2026-09-01'
  });
  const knownForecast = claim({
    id: 'known-forecast',
    noteId: 'forecast-note',
    observedAt: '2026-05-01',
    appliesToStart: '2026-07-01',
    appliesToEnd: '2026-10-01'
  });
  const openEndedQuarter = claim({
    id: 'open-quarter',
    noteId: 'open-quarter-note',
    observedAt: '2026-01-01',
    appliesToStart: '2026-01-01',
    appliesToEnd: undefined,
    horizon: 'quarter'
  });

  assert.equal(claimObservedBy(futureObserved, '2026-05-15'), false);
  assert.equal(claimObservedBy(knownForecast, '2026-05-15'), true);
  assert.equal(claimWindowStatus(knownForecast, '2026-05-15'), 'future');
  assert.equal(projectClaimAsOf(knownForecast, '2026-05-15').freshness, 'fresh');
  assert.equal(effectiveClaimEnd(openEndedQuarter), '2026-05-01');
});

test('claim freshness projects differently at earlier and later as-of dates', () => {
  const oldClaim = claim({
    id: 'old-freshness',
    noteId: 'old-freshness-note',
    observedAt: '2026-01-01',
    appliesToStart: '2026-01-01',
    appliesToEnd: '2026-02-01',
    freshness: 'fresh'
  });

  assert.equal(freshnessAsOf(oldClaim, '2026-02-15'), 'fresh');
  assert.equal(freshnessAsOf(oldClaim, '2026-05-15'), 'aging');
  assert.equal(freshnessAsOf(oldClaim, '2026-09-01'), 'stale');
  assert.equal(projectClaimAsOf(oldClaim, '2026-09-01').freshness, 'stale');
});

test('relations appear only after both endpoint claims have been observed', () => {
  const bull = claim({
    id: 'bull-known',
    noteId: 'bull-known-note',
    direction: 'positive',
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-01'
  });
  const bear = claim({
    id: 'bear-future',
    noteId: 'bear-future-note',
    direction: 'negative',
    text: 'Nvidia demand is weak as GPU supply slows.',
    observedAt: '2026-06-01',
    appliesToStart: '2026-06-01',
    appliesToEnd: '2026-09-01'
  });

  const earlyClaims = [bull, bear]
    .filter(item => claimObservedBy(item, '2026-05-15'))
    .map(item => projectClaimAsOf(item, '2026-05-15'));
  const laterClaims = [bull, bear]
    .filter(item => claimObservedBy(item, '2026-06-15'))
    .map(item => projectClaimAsOf(item, '2026-06-15'));

  assert.equal(detectRelations(earlyClaims, '2026-05-15').length, 0);
  assert(detectRelations(laterClaims, '2026-06-15').some(relation => relation.type === 'contradiction'));
});

test('detectRelations uses supplied as-of date when classifying stale evidence', () => {
  const oldBull = claim({
    id: 'old-bull-asof',
    noteId: 'old-bull-asof-note',
    direction: 'positive',
    observedAt: '2026-01-01',
    appliesToStart: '2026-01-01',
    appliesToEnd: '2026-02-01',
    freshness: 'fresh'
  });
  const newBull = claim({
    id: 'new-bull-asof',
    noteId: 'new-bull-asof-note',
    direction: 'positive',
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-01',
    freshness: 'fresh'
  });

  const relation = detectRelations([oldBull, newBull], '2026-09-01')[0];

  assert.equal(relation.type, 'stale_evidence');
});

test('deterministic candidate retriever preserves current relation candidate selection', () => {
  const claims = [
    claim({ id: 'candidate-bull', noteId: 'candidate-bull-note', direction: 'positive' }),
    claim({ id: 'candidate-bear', noteId: 'candidate-bear-note', direction: 'negative', text: 'Nvidia demand is weak as GPU supply slows.' }),
    claim({ id: 'candidate-msft', noteId: 'candidate-msft-note', subject: 'Microsoft', text: 'Microsoft Azure demand is strong.', themes: ['Enterprise software'] })
  ];

  const legacyCandidates = relationCandidates(claims).map(candidate => ({
    a: candidate.a.id,
    b: candidate.b.id,
    sharedWords: candidate.sharedWords,
    sharedMetadata: candidate.sharedMetadata
  }));
  const retrievedCandidates = deterministicCandidateRetriever.retrieve(claims).map(candidate => ({
    a: candidate.a.id,
    b: candidate.b.id,
    sharedWords: candidate.sharedWords,
    sharedMetadata: candidate.sharedMetadata
  }));

  assert.deepEqual(retrievedCandidates, legacyCandidates);
});

test('relation candidates include same-subject topic-only business driver matches', () => {
  const backlogBull = claim({
    id: 'topic-backlog-bull',
    noteId: 'topic-backlog-bull-note',
    direction: 'positive',
    text: 'Nvidia backlog expands.',
    evidence: 'Nvidia backlog expands.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });
  const cancellationsBear = claim({
    id: 'topic-cancellations-bear',
    noteId: 'topic-cancellations-bear-note',
    direction: 'negative',
    text: 'Nvidia cancellations rise.',
    evidence: 'Nvidia cancellations rise.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });

  const [candidate] = relationCandidates([backlogBull, cancellationsBear]);

  assert(candidate);
  assert(candidate.sharedWords < 2);
  assert.equal(candidate.sharedMetadata, 0);
  assert.deepEqual(candidate.sharedTopicFamilies, ['demand_orders']);
  assert.equal(candidate.topicScore, 2);
  assert.equal(candidate.classificationScore, candidate.sharedWords + candidate.sharedMetadata + candidate.topicScore);
});

test('topic-only candidates flow through temporal relation classification', () => {
  const backlogBull = claim({
    id: 'topic-relation-backlog-bull',
    noteId: 'topic-relation-backlog-bull-note',
    direction: 'positive',
    text: 'Nvidia backlog expands.',
    evidence: 'Nvidia backlog expands.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });
  const cancellationsBear = claim({
    id: 'topic-relation-cancellations-bear',
    noteId: 'topic-relation-cancellations-bear-note',
    direction: 'negative',
    text: 'Nvidia cancellations rise.',
    evidence: 'Nvidia cancellations rise.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });

  const [relation] = detectRelations([backlogBull, cancellationsBear], '2026-05-01');

  assert.equal(relation.type, 'contradiction');
  assert.equal(relation.overlapDays, 120);
});

test('legacy relation candidates keep their current classification score input', () => {
  const legacyBull = claim({
    id: 'legacy-score-bull',
    noteId: 'legacy-score-bull-note',
    direction: 'positive'
  });
  const legacyBear = claim({
    id: 'legacy-score-bear',
    noteId: 'legacy-score-bear-note',
    direction: 'negative',
    text: 'Nvidia demand is weak as GPU supply slows.',
    evidence: 'Nvidia demand is weak as GPU supply slows.'
  });

  const [candidate] = relationCandidates([legacyBull, legacyBear]);

  assert(candidate);
  assert.equal(candidate.classificationScore, candidate.sharedWords + candidate.sharedMetadata);
});

test('relation candidates treat issuer aliases as the same subject', () => {
  const canonicalBull = claim({
    id: 'issuer-alias-bull',
    noteId: 'issuer-alias-bull-note',
    subject: 'Nvidia',
    text: 'Nvidia demand is strong.',
    tickers: ['NVDA']
  });
  const aliasBear = claim({
    id: 'issuer-alias-bear',
    noteId: 'issuer-alias-bear-note',
    subject: 'NVIDIA Corporation',
    direction: 'negative',
    text: 'NVIDIA Corporation demand is weak.',
    tickers: ['NVDA']
  });

  const [candidate] = relationCandidates([canonicalBull, aliasBear]);

  assert(candidate);
  assert.equal(candidate.sharedMetadata > 0, true);
});

test('topic matching does not enrich extracted KPI metadata', () => {
  const note: Note = {
    ...base,
    id: 'topic-metadata',
    title: 'topic metadata',
    body: 'Nvidia backlog faces cancellations pressure.'
  };

  const [extracted] = extractClaims(note, '2026-05-01');

  assert(extracted);
  assert(!extracted.kpis?.includes('backlog'));
  assert(!extracted.kpis?.includes('cancellations'));
});

test('detectRelations accepts an injected candidate retriever before classifying candidates', () => {
  const lowKeywordBull = claim({
    id: 'forced-bull',
    noteId: 'forced-bull-note',
    direction: 'positive',
    text: 'Nvidia thesis brightens.',
    evidence: 'Nvidia thesis brightens.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });
  const lowKeywordBear = claim({
    id: 'forced-bear',
    noteId: 'forced-bear-note',
    direction: 'negative',
    text: 'Nvidia diligence worsens.',
    evidence: 'Nvidia diligence worsens.',
    themes: [],
    tickers: [],
    industries: [],
    kpis: [],
    watchlistTags: []
  });
  const retriever: CandidateRetriever = {
    retrieve(claims) {
      assert.deepEqual(claims.map(item => item.id), ['forced-bull', 'forced-bear']);
      return [{ a: lowKeywordBull, b: lowKeywordBear, sharedWords: 0, sharedMetadata: 0 }];
    }
  };

  assert.equal(detectRelations([lowKeywordBull, lowKeywordBear], '2026-05-01').length, 0);
  const [relation] = detectRelations([lowKeywordBull, lowKeywordBear], '2026-05-01', retriever);

  assert.equal(relation.type, 'contradiction');
  assert(relation.score > 0.6);
  assert(relation.score <= 1);
});

test('relations expose source-person context without changing temporal relation types', () => {
  const bear = claim({
    id: 'bear-dana',
    noteId: 'bear-note',
    direction: 'negative',
    text: 'Nvidia demand is weak as GPU supply slows.',
    sourcePeople: ['Dana Lee']
  } as Partial<Claim>);
  const bull = claim({
    id: 'bull-dana',
    noteId: 'bull-note',
    direction: 'positive',
    sourcePeople: ['Dana Lee']
  } as Partial<Claim>);
  const differentPersonBull = claim({
    id: 'bull-ravi',
    noteId: 'bull-note-2',
    direction: 'positive',
    sourcePeople: ['Ravi Patel']
  } as Partial<Claim>);

  assert.equal(classifyTemporalRelation(bear, bull, 4, '2026-05-01')?.type, 'contradiction');
  assert.equal(classifyTemporalRelation(bear, bull, 4, '2026-05-01')?.sourcePersonContext, 'same_source_person');
  assert.equal(classifyTemporalRelation(bear, differentPersonBull, 4, '2026-05-01')?.sourcePersonContext, 'different_source_people');
});

test('person memory summarizes accessible source-person claim history', () => {
  const claims = [
    claim({ id: 'dana-bear', noteId: 'dana-bear-note', direction: 'negative', sourcePeople: ['Dana Lee'], observedAt: '2026-04-01', appliesToStart: '2026-04-01', appliesToEnd: '2026-06-30' } as Partial<Claim>),
    claim({ id: 'dana-bull', noteId: 'dana-bull-note', direction: 'positive', sourcePeople: ['Dana Lee'], observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-29' } as Partial<Claim>),
    claim({ id: 'ravi-bull', direction: 'positive', subject: 'Microsoft', sourcePeople: ['Ravi Patel'] } as Partial<Claim>)
  ];
  const relations = detectRelations(claims);

  const people = buildPersonMemory(claims, relations);
  const dana = people.find(person => person.name === 'Dana Lee');

  assert(dana);
  assert.equal(dana.claimCount, 2);
  assert.equal(dana.positives, 1);
  assert.equal(dana.negatives, 1);
  assert.deepEqual(dana.subjects, ['Nvidia']);
  assert(dana.contradictions >= 1);
  assert.equal(dana.latestClaimId, 'dana-bull');
});

test('pipeline exposes source-person memory for visible claims', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'old bear', body: 'Nvidia demand is weak as GPU supply slows.', sourcePeople: ['Dana Lee'] },
    { ...base, id: 'n2', title: 'new bull', body: 'Nvidia demand is strong and GPU supply is tight.', sourcePeople: ['Dana Lee'] },
    { ...base, id: 'n3', title: 'hidden', team: 'Consumer', authorId: 'other', body: 'Nvidia demand is strong and GPU supply is tight.', sourcePeople: ['Ravi Patel'] }
  ];

  const graph = runPipeline(notes, analyst);

  assert(graph.people.some(person => person.name === 'Dana Lee' && person.claimCount === 2));
  assert(!graph.people.some(person => person.name === 'Ravi Patel'));
});
