import test from 'node:test';
import assert from 'node:assert/strict';
import type { Note, User } from '../src/engine';
import {
  createMemoryWorkspaceRepository,
  createWorkspaceService,
  type ClaimReviewStatus,
  type RelationReviewStatus,
  type WorkspaceExport
} from '../server/workspace-service';

const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis' },
  { id: 'u2', name: 'Owen Vale', role: 'Analyst', team: 'Consumer' },
  { id: 'u3', name: 'Priya Shah', role: 'PM', team: 'Portfolio' },
  { id: 'u4', name: 'Nora Bell', role: 'Compliance', team: 'Compliance' }
];

const base = {
  authorId: 'u1',
  team: 'Semis',
  visibility: 'team' as const,
  sourceType: 'Channel check',
  createdAt: '2026-05-01',
  observedAt: '2026-05-01',
  appliesToStart: '2026-05-01',
  appliesToEnd: '2026-08-01',
  horizon: 'near_term' as const
};

const notes: Note[] = [
  { ...base, id: 'n1', title: 'visible bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
  { ...base, id: 'n2', title: 'hidden bear', team: 'Consumer', authorId: 'u2', body: 'Nvidia demand is weak as GPU supply slows.' },
  { ...base, id: 'n3', title: 'pm scratchpad', team: 'Portfolio', authorId: 'u3', visibility: 'private', body: 'Apple services revenue remains robust and App Store pricing is improving.' }
];

function buildService() {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({ organizationId: 'org1', users, notes });
  return { repository, service };
}

test('workspace snapshots enforce permissions before graph computation', async () => {
  const { service } = buildService();

  const analyst = await service.getWorkspace('u1');
  const pm = await service.getWorkspace('u3');

  assert.deepEqual(analyst.visibleNotes.map(n => n.id).sort(), ['n1']);
  assert.equal(analyst.relations.length, 0);
  assert.deepEqual(pm.visibleNotes.map(n => n.id).sort(), ['n1', 'n2', 'n3']);
  assert(pm.relations.some(r => r.type === 'contradiction'));
});

test('note creation persists metadata, materializes graph rows, and writes audit events', async () => {
  const { repository, service } = buildService();

  const snapshot = await service.createNote('u1', {
    title: 'new check',
    body: 'Nvidia Blackwell demand is strong into Q3 and GPU supply is tight.',
    visibility: 'team',
    observedAt: '2026-05-06',
    tickers: ['NVDA'],
    manualThemes: ['AI infrastructure'],
    kpis: ['demand']
  });

  const createdNote = snapshot.visibleNotes.find(note => note.title === 'new check');
  assert(createdNote);
  assert.deepEqual(createdNote.tickers, ['NVDA']);
  assert.deepEqual(createdNote.manualThemes, ['AI infrastructure']);
  assert.deepEqual(createdNote.kpis, ['demand']);
  assert.equal(createdNote.appliesToStart, undefined);
  assert.equal(createdNote.appliesToEnd, undefined);
  assert.equal(createdNote.horizon, undefined);
  const createdClaim = snapshot.claims.find(claim => claim.text.includes('Blackwell demand'));
  assert(createdClaim);
  assert.equal(createdClaim.horizon, 'quarter');
  assert.equal(createdClaim.appliesToStart, '2026-05-06');
  assert(createdClaim.themes.includes('AI infrastructure'));
  assert(repository.auditEvents.some(event => event.action === 'note.created'));
  assert(repository.auditEvents.some(event => event.action === 'graph.materialized'));
});

test('claim edits recompute relations and preserve review status', async () => {
  const { repository, service } = buildService();
  await service.materializeGraph('org1');

  const pmSnapshot = await service.getWorkspace('u3');
  const bearishClaim = pmSnapshot.claims.find(claim => claim.noteId === 'n2');
  assert(bearishClaim);

  await service.updateClaim('u3', bearishClaim.id, {
    reviewStatus: 'edited' satisfies ClaimReviewStatus,
    direction: 'positive',
    text: 'Nvidia demand is strong as GPU supply improves.'
  });

  const updated = await service.getWorkspace('u3');
  const editedClaim = updated.claims.find(claim => claim.id === bearishClaim.id);
  assert.equal(editedClaim?.reviewStatus, 'edited');
  assert(!updated.relations.some(relation => relation.type === 'contradiction'));
  assert(repository.auditEvents.some(event => event.action === 'claim.updated'));
});

test('rejected claims stay auditable but leave the active graph', async () => {
  const { repository, service } = buildService();
  await service.materializeGraph('org1');

  const pmSnapshot = await service.getWorkspace('u3');
  const rejected = pmSnapshot.claims.find(claim => claim.noteId === 'n2');
  assert(rejected);

  await service.updateClaim('u3', rejected.id, {
    reviewStatus: 'analyst_rejected' satisfies ClaimReviewStatus
  });

  const updated = await service.getWorkspace('u3');
  assert(updated.claims.some(claim => claim.id === rejected.id && claim.reviewStatus === 'analyst_rejected'));
  assert(!updated.relations.some(relation => relation.a.id === rejected.id || relation.b.id === rejected.id));
  assert(!updated.alerts.some(alert => alert.severity === 'high'));
  assert(repository.auditEvents.some(event => event.action === 'claim.rejected'));
});

test('dismissed and reclassified relations affect active graph outputs', async () => {
  const { repository, service } = buildService();
  await service.materializeGraph('org1');

  const pmSnapshot = await service.getWorkspace('u3');
  const relation = pmSnapshot.relations.find(r => r.type === 'contradiction');
  assert(relation);

  await service.updateRelation('u3', relation.id, {
    reviewStatus: 'dismissed' satisfies RelationReviewStatus,
    reviewNote: 'Not relevant after PM review.'
  });

  const dismissed = await service.getWorkspace('u3');
  assert(!dismissed.relations.some(r => r.id === relation.id));
  assert(repository.relations.some(r => r.id === relation.id && r.reviewStatus === 'dismissed'));

  await service.updateRelation('u3', relation.id, {
    reviewStatus: 'reclassified' satisfies RelationReviewStatus,
    type: 'historical_tension'
  });

  const reclassified = await service.getWorkspace('u3');
  assert(reclassified.relations.some(r => r.id === relation.id && r.type === 'historical_tension'));
});

test('workspace export is permission-aware and import restores demo review state', async () => {
  const source = buildService();
  await source.service.materializeGraph('org1');

  const analystExport = await source.service.exportWorkspace('u1');
  assert.deepEqual(analystExport.snapshot.visibleNotes.map(note => note.id).sort(), ['n1']);
  assert(!analystExport.snapshot.visibleNotes.some(note => note.id === 'n2'));
  assert(!analystExport.snapshot.claims.some(claim => claim.noteId === 'n2'));

  const pmSnapshot = await source.service.getWorkspace('u3');
  const bearishClaim = pmSnapshot.claims.find(claim => claim.noteId === 'n2');
  assert(bearishClaim);
  const relation = pmSnapshot.relations.find(item => item.type === 'contradiction');
  assert(relation);

  await source.service.updateClaim('u3', bearishClaim.id, {
    reviewStatus: 'edited' satisfies ClaimReviewStatus,
    text: 'Nvidia demand is weak after a soft channel patch.',
    direction: 'negative',
    reviewNote: 'Normalized for demo restore.'
  });
  await source.service.updateRelation('u3', relation.id, {
    reviewStatus: 'reclassified' satisfies RelationReviewStatus,
    type: 'historical_tension',
    reviewNote: 'Same theme, different read.'
  });

  const exported = await source.service.exportWorkspace('u3');
  const targetRepository = createMemoryWorkspaceRepository();
  targetRepository.seed({ organizationId: 'org2', users, notes: [] });
  const targetService = createWorkspaceService(targetRepository);

  const restored = await targetService.importWorkspace('u3', exported satisfies WorkspaceExport);

  assert.deepEqual(restored.visibleNotes.map(note => note.id).sort(), ['n1', 'n2', 'n3']);
  assert(restored.visibleNotes.every(note => note.orgId === 'org2'));
  assert(restored.claims.some(claim => (
    claim.id === bearishClaim.id
    && claim.orgId === 'org2'
    && claim.reviewStatus === 'edited'
    && claim.text === 'Nvidia demand is weak after a soft channel patch.'
    && claim.reviewNote === 'Normalized for demo restore.'
  )));
  assert(restored.relations.some(item => (
    item.id === relation.id
    && item.orgId === 'org2'
    && item.type === 'historical_tension'
    && item.reviewStatus === 'reclassified'
    && item.reviewNote === 'Same theme, different read.'
  )));
  assert(targetRepository.auditEvents.some(event => event.action === 'workspace.imported'));
});
