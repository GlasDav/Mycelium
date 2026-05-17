import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMapLaneModel,
  laneForRelation,
  mapDensityLimits,
  relationEndpointLabel,
  relationWindowStatuses
} from '../src/map-layout';
import type { Claim, Relation, RelationType } from '../src/engine';

const baseClaim: Claim = {
  id: 'claim',
  noteId: 'note',
  subject: 'Nvidia',
  text: 'Nvidia demand is strong.',
  direction: 'positive',
  evidence: 'Nvidia demand is strong.',
  confidence: 0.8,
  themes: ['AI infrastructure'],
  tickers: ['NVDA'],
  industries: ['Semiconductors'],
  companyTags: ['Nvidia'],
  kpis: ['demand'],
  watchlistTags: ['AI Capex'],
  sourcePeople: ['Dana Lee'],
  createdAt: '2026-05-01',
  observedAt: '2026-05-01',
  appliesToStart: '2026-05-01',
  appliesToEnd: '2026-06-30',
  horizon: 'quarter',
  freshness: 'fresh',
  authorId: 'u1',
  visibility: 'team',
  accessScope: 'team',
  team: 'Semis',
  teamId: 'team-semis'
};

test('map lane helpers classify current/upcoming and historical relations by endpoint windows', () => {
  const current = relation('current', claim('a', 'Nvidia', '2026-05-01', '2026-06-30'), claim('b', 'Apple', '2026-07-01', '2026-09-30'));
  const historical = relation('historical', claim('c', 'Nvidia', '2025-01-01', '2025-03-31'), claim('d', 'Apple', '2025-04-01', '2025-06-30'));

  assert.deepEqual(relationWindowStatuses(current, '2026-05-15'), { a: 'current', b: 'upcoming' });
  assert.equal(laneForRelation(current, '2026-05-15'), 'current');
  assert.deepEqual(relationWindowStatuses(historical, '2026-05-15'), { a: 'ended', b: 'ended' });
  assert.equal(laneForRelation(historical, '2026-05-15'), 'historical');
});

test('map lane model applies density budgets and reports hidden counts per lane', () => {
  const relations = Array.from({ length: 6 }, (_, index) => relation(
    `r${index}`,
    claim(`a${index}`, 'Nvidia', '2026-05-01', '2026-06-30'),
    claim(`b${index}`, `Company ${index}`, '2026-05-01', '2026-06-30'),
    'contradiction'
  ));

  const model = buildMapLaneModel(relations, {
    asOf: '2026-05-15',
    density: 'low',
    lane: 'current',
    selectedRelationId: 'r2',
    selectedSubject: 'Nvidia'
  });

  assert.deepEqual(mapDensityLimits.low, { graph: 4, list: 3 });
  assert.equal(model.relations.length, 6);
  assert.equal(model.graphRelations.length, 4);
  assert.equal(model.listRelations.length, 3);
  assert.equal(model.hiddenGraphCount, 2);
  assert.equal(model.hiddenListCount, 3);
  assert.equal(model.selectedRelation?.id, 'r2');
  assert(model.nodes.every(node => node.lane === 'current'));
  assert.deepEqual(model.nodes.map(node => node.subject), ['Company 0', 'Company 1', 'Company 2', 'Company 3']);
  assert.deepEqual(model.nodes.map(node => node.selected), [false, false, true, false]);
  assert(model.nodes.every(node => node.x.endsWith('%') && node.y.endsWith('%') && node.edgeRotation.endsWith('deg')));
});

test('map lane model falls back selection to the first filtered relation', () => {
  const relations = [
    relation('first', claim('a1', 'Nvidia', '2026-05-01', '2026-06-30'), claim('b1', 'Apple', '2026-05-01', '2026-06-30')),
    relation('second', claim('a2', 'Nvidia', '2026-05-01', '2026-06-30'), claim('b2', 'Microsoft', '2026-05-01', '2026-06-30'))
  ];

  const model = buildMapLaneModel(relations, {
    asOf: '2026-05-15',
    density: 'medium',
    lane: 'current',
    selectedRelationId: 'missing',
    selectedSubject: 'Nvidia'
  });

  assert.equal(model.selectedRelation?.id, 'first');
  assert.deepEqual(model.nodes.map(node => node.selected), [true, false]);
});

test('map lane model pins the selected relation when density would otherwise hide it', () => {
  const relations = Array.from({ length: 6 }, (_, index) => relation(
    `r${index + 1}`,
    claim(`a${index + 1}`, 'Nvidia', '2026-05-01', '2026-06-30'),
    claim(`b${index + 1}`, `Company ${index + 1}`, '2026-05-01', '2026-06-30'),
    'contradiction'
  ));

  const model = buildMapLaneModel(relations, {
    asOf: '2026-05-15',
    density: 'low',
    lane: 'current',
    selectedRelationId: 'r6',
    selectedSubject: 'Nvidia'
  });

  assert.equal(model.graphRelations.length, 4);
  assert.equal(model.listRelations.length, 3);
  assert(model.graphRelations.some(item => item.id === 'r6'));
  assert(model.listRelations.some(item => item.id === 'r6'));
  assert.equal(model.selectedRelation?.id, 'r6');
  assert(model.nodes.some(node => node.relationId === 'r6' && node.selected));
});

test('relation endpoint label shows the opposite endpoint when selected subject matches either side', () => {
  const item = relation('label', claim('a', 'Nvidia', '2026-05-01', '2026-06-30'), claim('b', 'Apple', '2026-05-01', '2026-06-30'));

  assert.equal(relationEndpointLabel(item, 'Nvidia'), 'Apple');
  assert.equal(relationEndpointLabel(item, 'Apple'), 'Nvidia');
  assert.equal(relationEndpointLabel(item, ''), 'Nvidia');
});

function claim(id: string, subject: string, start: string, end: string): Claim {
  return {
    ...baseClaim,
    id,
    subject,
    text: `${subject} demand is strong.`,
    evidence: `${subject} demand is strong.`,
    appliesToStart: start,
    appliesToEnd: end
  };
}

function relation(id: string, a: Claim, b: Claim, type: RelationType = 'corroboration'): Relation {
  return {
    id,
    type,
    a,
    b,
    reason: 'test relation',
    score: 0.7,
    overlapDays: 30
  };
}
