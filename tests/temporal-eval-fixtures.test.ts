import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runPipeline,
  type Freshness,
  type Note,
  type RelationType,
  type User
} from '../src/engine';

const analyst: User = { id: 'a', name: 'Analyst', role: 'Analyst', team: 'Semis' };

const baseNote = {
  authorId: 'a',
  team: 'Semis',
  visibility: 'team' as const,
  sourceType: 'call'
};

interface TemporalEvalFixture {
  name: string;
  notes: Note[];
  expectedRelationType: RelationType;
  forbiddenRelationTypes?: RelationType[];
  expectedClaimFreshness?: Array<{ noteId: string; freshness: Freshness }>;
  minOverlapDays?: number;
  maxOverlapDays?: number;
  expectedHighSeverityAlert?: boolean;
}

function note(
  id: string,
  body: string,
  observedAt: string,
  appliesToStart: string,
  appliesToEnd: string
): Note {
  return {
    ...baseNote,
    id,
    title: id,
    body,
    createdAt: observedAt,
    observedAt,
    appliesToStart,
    appliesToEnd
  };
}

const temporalEvalFixtures: TemporalEvalFixture[] = [
  {
    name: 'overlapping opposing same-quarter reads classify as a true contradiction',
    notes: [
      note('overlap-bull', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-08-01'),
      note('overlap-bear', 'Nvidia demand is weak as GPU supply slows.', '2026-06-01', '2026-06-01', '2026-09-01')
    ],
    expectedRelationType: 'contradiction',
    minOverlapDays: 30,
    expectedHighSeverityAlert: true
  },
  {
    name: 'twelve-month opposing reads classify as a trend reversal, not a contradiction',
    notes: [
      note('old-bear', 'Nvidia demand is weak as GPU supply growth slows.', '2025-05-01', '2025-05-01', '2025-07-31'),
      note('new-bull', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-08-01')
    ],
    expectedRelationType: 'update_or_trend_reversal',
    forbiddenRelationTypes: ['contradiction'],
    maxOverlapDays: 0
  },
  {
    name: 'old aligned evidence beside a fresh aligned read classifies as stale evidence',
    notes: [
      note('old-aligned-bull', 'Nvidia demand is strong and GPU supply is tight.', '2025-01-01', '2025-01-01', '2025-03-31'),
      note('fresh-aligned-bull', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-08-01')
    ],
    expectedRelationType: 'stale_evidence',
    expectedClaimFreshness: [{ noteId: 'old-aligned-bull', freshness: 'stale' }],
    maxOverlapDays: 0
  },
  {
    name: 'small overlap in opposing reads stays in historical tension',
    notes: [
      note('narrow-bull', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-06-15'),
      note('narrow-bear', 'Nvidia demand is weak as GPU supply slows.', '2026-06-01', '2026-06-01', '2026-06-20')
    ],
    expectedRelationType: 'historical_tension',
    forbiddenRelationTypes: ['contradiction'],
    minOverlapDays: 1,
    maxOverlapDays: 29
  },
  {
    name: 'nearby non-overlapping opposing reads stay in open tension',
    notes: [
      note('nearby-bull', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-05-31'),
      note('nearby-bear', 'Nvidia demand is weak as GPU supply slows.', '2026-06-15', '2026-06-15', '2026-07-15')
    ],
    expectedRelationType: 'open_tension',
    forbiddenRelationTypes: ['contradiction', 'update_or_trend_reversal'],
    maxOverlapDays: 0
  },
  {
    name: 'aligned overlapping reads classify as corroboration',
    notes: [
      note('same-window-bull-a', 'Nvidia demand is strong and GPU supply is tight.', '2026-05-01', '2026-05-01', '2026-08-01'),
      note('same-window-bull-b', 'Nvidia demand remains strong and GPU supply is tight.', '2026-05-15', '2026-05-15', '2026-08-15')
    ],
    expectedRelationType: 'corroboration',
    minOverlapDays: 30
  },
  {
    name: 'aligned separated but still useful reads classify as agreement',
    notes: [
      note('separated-bull-a', 'Nvidia demand is strong and GPU supply is tight.', '2026-01-01', '2026-01-01', '2026-01-31'),
      note('separated-bull-b', 'Nvidia demand remains strong and GPU supply is tight.', '2026-04-01', '2026-04-01', '2026-04-30')
    ],
    expectedRelationType: 'agreement',
    forbiddenRelationTypes: ['stale_evidence'],
    expectedClaimFreshness: [{ noteId: 'separated-bull-a', freshness: 'aging' }],
    maxOverlapDays: 0
  }
];

for (const fixture of temporalEvalFixtures) {
  test(`temporal eval fixture: ${fixture.name}`, () => {
    const graph = runPipeline(fixture.notes, analyst);
    const actualRelationTypes = graph.relations.map(relation => relation.type);
    const relation = graph.relations.find(item => item.type === fixture.expectedRelationType);

    assert(
      relation,
      `${fixture.name}: expected ${fixture.expectedRelationType}, got ${actualRelationTypes.join(', ') || 'no relations'}`
    );

    for (const forbiddenType of fixture.forbiddenRelationTypes ?? []) {
      assert(
        !actualRelationTypes.includes(forbiddenType),
        `${fixture.name}: did not expect ${forbiddenType}, got ${actualRelationTypes.join(', ')}`
      );
    }

    if (fixture.minOverlapDays !== undefined) {
      assert(
        relation.overlapDays >= fixture.minOverlapDays,
        `${fixture.name}: expected at least ${fixture.minOverlapDays} overlap days, got ${relation.overlapDays}`
      );
    }

    if (fixture.maxOverlapDays !== undefined) {
      assert(
        relation.overlapDays <= fixture.maxOverlapDays,
        `${fixture.name}: expected at most ${fixture.maxOverlapDays} overlap days, got ${relation.overlapDays}`
      );
    }

    for (const expected of fixture.expectedClaimFreshness ?? []) {
      const matchingClaim = graph.claims.find(claim => claim.noteId === expected.noteId);
      assert(matchingClaim, `${fixture.name}: expected claim for note ${expected.noteId}`);
      assert.equal(matchingClaim.freshness, expected.freshness);
    }

    if (fixture.expectedHighSeverityAlert !== undefined) {
      assert.equal(graph.alerts.some(alert => alert.severity === 'high'), fixture.expectedHighSeverityAlert);
    }
  });
}
