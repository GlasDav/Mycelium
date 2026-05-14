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
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis', teamId: 'team-semis', primaryTeamId: 'team-semis', orgRole: 'member', status: 'active', teamMemberships: [{ teamId: 'team-semis', teamName: 'Semis', role: 'member', status: 'active' }] },
  { id: 'u2', name: 'Owen Vale', role: 'Analyst', team: 'Consumer', teamId: 'team-consumer', primaryTeamId: 'team-consumer', orgRole: 'member', status: 'active', teamMemberships: [{ teamId: 'team-consumer', teamName: 'Consumer', role: 'member', status: 'active' }] },
  { id: 'u3', name: 'Priya Shah', role: 'PM', team: 'Portfolio', teamId: 'team-portfolio', primaryTeamId: 'team-portfolio', orgRole: 'admin', status: 'active', teamMemberships: [{ teamId: 'team-portfolio', teamName: 'Portfolio', role: 'member', status: 'active' }] },
  { id: 'u4', name: 'Nora Bell', role: 'Compliance', team: 'Compliance', teamId: 'team-compliance', primaryTeamId: 'team-compliance', orgRole: 'member', status: 'active', teamMemberships: [{ teamId: 'team-compliance', teamName: 'Compliance', role: 'member', status: 'active' }] }
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

test('workspace access scopes support organization, team, and author-only personal notes', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'team-note', title: 'team note', body: 'Nvidia demand is strong and GPU supply is tight.' },
      { ...base, id: 'org-note', title: 'org note', visibility: 'public', accessScope: 'organization', team: undefined, teamId: undefined, body: 'Apple services revenue remains robust.' } as Note,
      { ...base, id: 'maya-personal', title: 'maya personal', visibility: 'private', accessScope: 'personal', team: undefined, teamId: undefined, body: 'Shopify demand is recovering.' } as Note,
      { ...base, id: 'owen-personal', title: 'owen personal', authorId: 'u2', visibility: 'private', accessScope: 'personal', team: undefined, teamId: undefined, body: 'Tesla inventory is increasing.' } as Note
    ]
  });

  const maya = await service.getWorkspace('u1');
  const pm = await service.getWorkspace('u3');

  assert.deepEqual(maya.visibleNotes.map(note => note.id).sort(), ['maya-personal', 'org-note', 'team-note']);
  assert.deepEqual(pm.visibleNotes.map(note => note.id).sort(), ['org-note', 'team-note']);
});

test('multi-team contributors can save team-scoped notes into any active assigned team', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users: [
      {
        ...users[0],
        teamMemberships: [
          { teamId: 'team-semis', teamName: 'Semis', role: 'member', status: 'active' },
          { teamId: 'team-consumer', teamName: 'Consumer', role: 'member', status: 'active' }
        ]
      },
      ...users.slice(1)
    ] as User[],
    notes: []
  });

  const snapshot = await service.createNote('u1', {
    body: 'Apple iPhone demand is weak but Services pricing remains robust.',
    accessScope: 'team',
    teamId: 'team-consumer'
  } as Parameters<typeof service.createNote>[1]);

  const created = snapshot.visibleNotes.find(note => note.body.includes('Apple iPhone'));
  assert.equal(created?.accessScope, 'team');
  assert.equal(created?.teamId, 'team-consumer');
  assert.equal(created?.team, 'Consumer');
});

test('personal notes contribute only to the author workspace graph and stay out of dashboards', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'team-bull', title: 'team bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
      { ...base, id: 'personal-bear', title: 'personal bear', visibility: 'private', accessScope: 'personal', team: undefined, teamId: undefined, body: 'Nvidia demand is weak as GPU supply slows.' } as Note,
      { ...base, id: 'org-note', title: 'org read', visibility: 'public', accessScope: 'organization', team: undefined, teamId: undefined, body: 'Microsoft Azure capex growth is improving.' } as Note
    ]
  });

  const mayaWorkspace = await service.getWorkspace('u1');
  const pmWorkspace = await service.getWorkspace('u3');
  const mayaTeamDashboard = await service.getDashboard('u1', { scope: 'team', range: 'all', teamId: 'team-semis' });
  const pmOrgDashboard = await service.getDashboard('u3', { scope: 'org', range: 'all' });

  assert(mayaWorkspace.relations.some(relation => relation.a.noteId === 'personal-bear' || relation.b.noteId === 'personal-bear'));
  assert(!pmWorkspace.visibleNotes.some(note => note.id === 'personal-bear'));
  assert(!pmWorkspace.relations.some(relation => relation.a.noteId === 'personal-bear' || relation.b.noteId === 'personal-bear'));
  assert.equal(mayaTeamDashboard.totals.notes, 1);
  assert.equal(pmOrgDashboard.totals.notes, 2);
});

test('organization admins manage teams, invites, memberships, and deactivation without research visibility escalation', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({ organizationId: 'org1', users, notes });

  await assert.rejects(() => service.getAdminOrganization('u1'), /administrator/);

  const createdTeam = await service.createOrganizationTeam('u3', { name: 'Healthcare' });
  await service.updateOrganizationTeam('u3', createdTeam.id, { name: 'Health Care' });
  await service.archiveOrganizationTeam('u3', createdTeam.id);
  const invite = await service.createOrganizationInvite('u3', {
    email: 'new.analyst@example.test',
    role: 'Analyst',
    orgRole: 'member',
    teamIds: ['team-semis']
  });
  await service.cancelOrganizationInvite('u3', invite.id);
  await service.updateOrganizationMember('u3', 'u1', { orgRole: 'admin' });
  await service.replaceOrganizationMemberTeams('u3', 'u1', ['team-semis', 'team-consumer']);
  await service.updateOrganizationMember('u3', 'u2', { status: 'deactivated' });

  const admin = await service.getAdminOrganization('u3');
  assert(admin.teams.some(team => team.id === createdTeam.id && team.status === 'archived'));
  assert(admin.invites.some(item => item.id === invite.id && item.status === 'cancelled'));
  assert(admin.members.find(member => member.id === 'u1')?.teamMemberships.some(team => team.teamId === 'team-consumer'));
  await assert.rejects(() => service.getWorkspace('u2'), /deactivated/);
  await service.updateOrganizationMember('u3', 'u1', { orgRole: 'member' });
  await assert.rejects(() => service.updateOrganizationMember('u3', 'u3', { orgRole: 'member' }), /last active organization admin/);
});

test('workspace as-of snapshots exclude future claims and preserve permissions', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'hist-bull', title: 'known bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
      {
        ...base,
        id: 'future-bear',
        title: 'future bear',
        team: 'Consumer',
        authorId: 'u2',
        createdAt: '2026-06-01',
        observedAt: '2026-06-01',
        appliesToStart: '2026-06-01',
        appliesToEnd: '2026-09-01',
        body: 'Nvidia demand is weak as GPU supply slows.'
      }
    ]
  });
  await service.materializeGraph('org1');

  const earlyPm = await service.getWorkspace('u3', { asOf: '2026-05-15' });
  assert.equal(earlyPm.asOf, '2026-05-15');
  assert(earlyPm.claims.some(claim => claim.noteId === 'hist-bull'));
  assert(!earlyPm.claims.some(claim => claim.noteId === 'future-bear'));
  assert.equal(earlyPm.relations.length, 0);

  const laterPm = await service.getWorkspace('u3', { asOf: '2026-06-15' });
  assert(laterPm.claims.some(claim => claim.noteId === 'future-bear'));
  assert(laterPm.relations.some(relation => relation.type === 'contradiction'));

  const laterAnalyst = await service.getWorkspace('u1', { asOf: '2026-06-15' });
  assert(!laterAnalyst.visibleNotes.some(note => note.id === 'future-bear'));
  assert(!laterAnalyst.claims.some(claim => claim.noteId === 'future-bear'));
  assert.equal(laterAnalyst.relations.length, 0);
});

test('workspace as-of relation snapshots overlay persisted review state by stable relation id', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'overlay-bull', title: 'overlay bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
      {
        ...base,
        id: 'overlay-bear',
        title: 'overlay bear',
        createdAt: '2026-06-01',
        observedAt: '2026-06-01',
        appliesToStart: '2026-06-01',
        appliesToEnd: '2026-09-01',
        body: 'Nvidia demand is weak as GPU supply slows.'
      }
    ]
  });
  await service.materializeGraph('org1');
  const current = await service.getWorkspace('u3');
  const relation = current.relations.find(item => item.type === 'contradiction');
  assert(relation);

  await service.updateRelation('u3', relation.id, {
    reviewStatus: 'dismissed' satisfies RelationReviewStatus,
    reviewNote: 'Dismissed in current graph.'
  });
  const dismissed = await service.getWorkspace('u3', { asOf: '2026-06-15' });
  assert(!dismissed.relations.some(item => item.id === relation.id));

  await service.updateRelation('u3', relation.id, {
    reviewStatus: 'reclassified' satisfies RelationReviewStatus,
    type: 'historical_tension',
    reviewNote: 'Analyst selected historical tension.'
  });
  const reclassified = await service.getWorkspace('u3', { asOf: '2026-06-15' });
  assert(reclassified.relations.some(item => (
    item.id === relation.id
    && item.type === 'historical_tension'
    && item.originalType === 'contradiction'
    && item.reviewNote === 'Analyst selected historical tension.'
  )));
});

test('workspace relation review overlays tolerate legacy unsorted relation ids', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'legacy-bull', title: 'legacy bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
      {
        ...base,
        id: 'legacy-bear',
        title: 'legacy bear',
        createdAt: '2026-06-01',
        observedAt: '2026-06-01',
        appliesToStart: '2026-06-01',
        appliesToEnd: '2026-09-01',
        body: 'Nvidia demand is weak as GPU supply slows.'
      }
    ]
  });
  await service.materializeGraph('org1');
  const current = await service.getWorkspace('u3');
  const relation = current.relations.find(item => item.type === 'contradiction');
  assert(relation);
  const legacyId = `rel-${relation.b.id}-${relation.a.id}`;
  assert.notEqual(legacyId, relation.id);
  repository.relations = repository.relations.map(item => item.id === relation.id ? {
    ...item,
    id: legacyId,
    type: 'historical_tension',
    reviewStatus: 'reclassified',
    reviewNote: 'Legacy review id.'
  } : item);

  const overlaid = await service.getWorkspace('u3', { asOf: '2026-06-15' });
  assert(overlaid.relations.some(item => (
    item.id === relation.id
    && item.type === 'historical_tension'
    && item.reviewNote === 'Legacy review id.'
  )));

  await service.updateRelation('u3', relation.id, {
    reviewStatus: 'dismissed',
    reviewNote: 'Dismiss through stable id.'
  });
  assert(repository.relations.some(item => item.id === relation.id && item.reviewStatus === 'dismissed'));
});

test('workspace snapshots recompute current freshness after claim temporal edits', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      { ...base, id: 'freshness-edit', title: 'freshness edit', body: 'Nvidia demand is strong and GPU supply is tight.' }
    ]
  });
  await service.materializeGraph('org1');
  const current = await service.getWorkspace('u3');
  const claim = current.claims.find(item => item.noteId === 'freshness-edit');
  assert(claim);

  const updated = await service.updateClaim('u3', claim.id, {
    reviewStatus: 'edited',
    appliesToStart: '2025-01-01',
    appliesToEnd: '2025-01-31',
    horizon: 'near_term'
  });
  const edited = updated.claims.find(item => item.id === claim.id);

  assert.equal(edited?.freshness, 'stale');
});

test('graph materialization refreshes machine confidence and preserves reviewed confidence', async () => {
  const { repository, service } = buildService();
  await service.materializeGraph('org1');
  const currentClaims = await repository.listClaims('org1');
  const machineClaim = currentClaims.find(claim => claim.noteId === 'n1');
  const reviewedClaim = currentClaims.find(claim => claim.noteId === 'n2');
  assert(machineClaim);
  assert(reviewedClaim);

  repository.claims = repository.claims.map(claim => {
    if (claim.id === machineClaim.id) return { ...claim, confidence: 0.11, reviewStatus: 'machine' };
    if (claim.id === reviewedClaim.id) return { ...claim, confidence: 0.22, reviewStatus: 'analyst_confirmed' };
    return claim;
  });

  await service.materializeGraph('org1');
  const rematerializedClaims = await repository.listClaims('org1');
  const refreshedMachineClaim = rematerializedClaims.find(claim => claim.id === machineClaim.id);
  const preservedReviewedClaim = rematerializedClaims.find(claim => claim.id === reviewedClaim.id);

  assert.notEqual(refreshedMachineClaim?.confidence, 0.11);
  assert.equal(preservedReviewedClaim?.confidence, 0.22);
});

test('dashboard aggregates respect timeframe and role-gated scope availability', async () => {
  const repository = createMemoryWorkspaceRepository();
  const service = createWorkspaceService(repository);
  repository.seed({
    organizationId: 'org1',
    users,
    notes: [
      ...notes,
      {
        ...base,
        id: 'n4',
        title: 'old semis digest',
        createdAt: '2025-05-01',
        observedAt: '2025-05-01',
        appliesToStart: '2025-05-01',
        appliesToEnd: '2025-08-01',
        body: 'Nvidia demand was strong and GPU supply was tight last spring.'
      }
    ]
  });

  const analystWorkspace = await service.getDashboard('u1', { scope: 'workspace', range: '90d' });
  assert.equal(analystWorkspace.scope, 'workspace');
  assert.equal(analystWorkspace.range, '90d');
  assert.equal(analystWorkspace.totals.notes, 1);
  assert.equal(analystWorkspace.scopeAvailability.find(item => item.scope === 'org')?.enabled, false);
  assert.match(analystWorkspace.scopeAvailability.find(item => item.scope === 'org')?.reason ?? '', /PM or Compliance/);

  await assert.rejects(
    () => service.getDashboard('u1', { scope: 'org', range: '90d' }),
    /Dashboard scope org is not available/
  );

  const pmOrgRecent = await service.getDashboard('u3', { scope: 'org', range: '90d' });
  const pmOrgAll = await service.getDashboard('u3', { scope: 'org', range: 'all' });
  assert.equal(pmOrgRecent.scopeAvailability.find(item => item.scope === 'org')?.enabled, true);
  assert(pmOrgAll.totals.notes > pmOrgRecent.totals.notes);
  assert(pmOrgAll.relationMix.contradiction > 0);
  assert(pmOrgAll.topCompanies.some(item => item.label === 'Nvidia'));
  assert(pmOrgAll.freshness.stale >= 1);
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

test('normalized entity links persist through notes, claims, drafts, history, and people summaries', async () => {
  const { service } = buildService();

  const linkedEntities = [
    { type: 'security', role: 'security', key: 'nvda', name: 'NVDA', externalIds: { ticker: 'NVDA' } },
    { type: 'industry', role: 'industry', key: 'semiconductors', name: 'Semiconductors' },
    { type: 'theme', role: 'theme', key: 'ai-infrastructure', name: 'AI infrastructure' },
    { type: 'kpi', role: 'kpi', key: 'demand', name: 'Demand' },
    { type: 'watchlist', role: 'watchlist', key: 'ai-capex', name: 'AI Capex' },
    { type: 'source_person', role: 'source_person', key: 'dana-lee', name: 'Dana Lee' }
  ];

  const snapshot = await service.createNote('u1', {
    title: 'Dana channel check',
    body: 'Nvidia Blackwell demand is strong and GPU supply is tight.',
    visibility: 'team',
    observedAt: '2026-05-06',
    linkedEntities
  } as any);

  const createdNote = snapshot.visibleNotes.find(note => note.title === 'Dana channel check');
  assert(createdNote);
  assert.deepEqual(createdNote.linkedEntities?.map(entity => entity.name), ['NVDA', 'Semiconductors', 'AI infrastructure', 'Demand', 'AI Capex', 'Dana Lee']);
  assert.deepEqual(createdNote.tickers, ['NVDA']);
  assert.deepEqual(createdNote.industries, ['Information Technology', 'Semiconductors']);
  assert.deepEqual(createdNote.watchlistTags, ['AI Capex']);
  assert.deepEqual(createdNote.sourcePeople, ['Dana Lee']);

  const createdClaim = snapshot.claims.find(claim => claim.noteId === createdNote.id);
  assert(createdClaim);
  assert.deepEqual(createdClaim.sourcePeople, ['Dana Lee']);
  assert(createdClaim.linkedEntities?.some(entity => entity.role === 'source_person' && entity.name === 'Dana Lee'));
  assert(snapshot.people.some(person => (
    person.name === 'Dana Lee'
    && person.claimCount > 0
    && person.subjects.includes('Nvidia')
  )));

  const draft = await service.upsertNoteDraft('u1', {
    title: 'Draft with links',
    body: 'Nvidia demand follow-up.',
    visibility: 'team',
    observedAt: '2026-05-07',
    linkedEntities
  } as any);
  assert.deepEqual(draft.linkedEntities?.map(entity => entity.name), ['NVDA', 'Semiconductors', 'AI infrastructure', 'Demand', 'AI Capex', 'Dana Lee']);

  await service.updateNote('u1', createdNote.id, {
    body: 'Nvidia demand is weak as GPU supply slows.',
    linkedEntities: linkedEntities.filter(entity => entity.role !== 'watchlist')
  } as any);
  const history = await service.listNoteHistory('u1', createdNote.id);
  assert(history[0].changedFields.includes('linkedEntities'));
  assert(history[0].previousLinkedEntities?.some(entity => entity.role === 'watchlist' && entity.name === 'AI Capex'));
});

test('note body edits persist revision history and reset derived reviews', async () => {
  const { repository, service } = buildService();

  const created = await service.createNote('u1', {
    title: 'bearish channel follow-up',
    body: 'Nvidia demand is weak as GPU supply slows.',
    visibility: 'team',
    observedAt: '2026-05-06',
    tickers: ['NVDA'],
    manualThemes: ['AI infrastructure'],
    kpis: ['demand']
  });
  const createdNote = created.visibleNotes.find(note => note.title === 'bearish channel follow-up');
  assert(createdNote);
  const bearishClaim = created.claims.find(claim => claim.noteId === createdNote.id && claim.text.includes('weak'));
  const relation = created.relations.find(item => item.a.noteId === createdNote.id || item.b.noteId === createdNote.id);
  assert(bearishClaim);
  assert(relation);

  await service.updateClaim('u1', bearishClaim.id, {
    reviewStatus: 'edited',
    reviewNote: 'Analyst normalized the weak read.'
  });
  await service.updateRelation('u1', relation.id, {
    reviewStatus: 'reclassified',
    type: 'historical_tension',
    reviewNote: 'Prior channel read was noisy.'
  });

  const updated = await service.updateNote('u1', createdNote.id, {
    body: 'Nvidia demand is strong as GPU supply improves.',
    tickers: ['NVDA', 'MSFT']
  });

  const savedNote = updated.visibleNotes.find(note => note.id === createdNote.id);
  assert.equal(savedNote?.body, 'Nvidia demand is strong as GPU supply improves.');
  assert.deepEqual(savedNote?.tickers, ['NVDA', 'MSFT']);

  const history = await service.listNoteHistory('u1', createdNote.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].previousBody, 'Nvidia demand is weak as GPU supply slows.');
  assert.deepEqual(history[0].changedFields.sort(), ['body', 'tickers']);

  const refreshedClaim = updated.claims.find(claim => claim.noteId === createdNote.id);
  assert.equal(refreshedClaim?.reviewStatus, 'machine');
  assert.equal(refreshedClaim?.reviewNote, undefined);
  assert(!updated.relations.some(item => item.id === relation.id && item.reviewStatus === 'reclassified'));
  assert(repository.auditEvents.some(event => event.action === 'note.updated'));
  assert(repository.auditEvents.some(event => event.action === 'note.revision.created'));
});

test('note history respects prior revision visibility', async () => {
  const { service } = buildService();

  const created = await service.createNote('u1', {
    title: 'private thesis',
    body: 'Nvidia demand is weak as GPU supply slows.',
    visibility: 'private',
    observedAt: '2026-05-06'
  });
  const createdNote = created.visibleNotes.find(note => note.title === 'private thesis');
  assert(createdNote);

  await service.updateNote('u1', createdNote.id, {
    body: 'Nvidia demand is strong as GPU supply improves.',
    visibility: 'public'
  });

  assert.equal((await service.listNoteHistory('u1', createdNote.id)).length, 1);
  assert.equal((await service.listNoteHistory('u2', createdNote.id)).length, 0);
  assert.equal((await service.listNoteHistory('u3', createdNote.id)).length, 0);
});

test('title-only note edits preserve derived claim and relation review state', async () => {
  const { service } = buildService();

  const created = await service.createNote('u1', {
    title: 'weak read',
    body: 'Nvidia demand is weak as GPU supply slows.',
    visibility: 'team',
    observedAt: '2026-05-06'
  });
  const createdNote = created.visibleNotes.find(note => note.title === 'weak read');
  assert(createdNote);
  const bearishClaim = created.claims.find(claim => claim.noteId === createdNote.id);
  const relation = created.relations.find(item => item.a.noteId === createdNote.id || item.b.noteId === createdNote.id);
  assert(bearishClaim);
  assert(relation);

  await service.updateClaim('u1', bearishClaim.id, {
    reviewStatus: 'analyst_confirmed',
    reviewNote: 'Still valid.'
  });
  await service.updateRelation('u1', relation.id, {
    reviewStatus: 'reclassified',
    type: 'historical_tension',
    reviewNote: 'Context changed.'
  });

  const updated = await service.updateNote('u1', createdNote.id, {
    title: 'renamed weak read'
  });

  assert(updated.visibleNotes.some(note => note.id === createdNote.id && note.title === 'renamed weak read'));
  assert(updated.claims.some(claim => (
    claim.id === bearishClaim.id
    && claim.reviewStatus === 'analyst_confirmed'
    && claim.reviewNote === 'Still valid.'
  )));
  assert(updated.relations.some(item => (
    item.id === relation.id
    && item.reviewStatus === 'reclassified'
    && item.reviewNote === 'Context changed.'
  )));
});

test('only a note author can edit the note body or metadata', async () => {
  const { service } = buildService();

  await assert.rejects(
    () => service.updateNote('u3', 'n1', { title: 'PM rewrite' }),
    /Only the note author can edit/
  );
});

test('note drafts persist per viewer and can be cleared', async () => {
  const { repository, service } = buildService();

  const saved = await service.upsertNoteDraft('u1', {
    selectedNoteId: 'n1',
    title: 'Recovered draft',
    body: 'Nvidia draft evidence before save.',
    visibility: 'private',
    observedAt: '2026-05-07',
    tickers: ['NVDA'],
    manualThemes: ['AI infrastructure'],
    kpis: ['demand']
  });
  assert.equal(saved.userId, 'u1');
  assert.equal(saved.orgId, 'org1');

  const freshService = createWorkspaceService(repository);
  const draft = await freshService.getNoteDraft('u1');
  assert.equal(draft?.title, 'Recovered draft');
  assert.equal(draft?.selectedNoteId, 'n1');
  assert.deepEqual(draft?.tickers, ['NVDA']);

  await freshService.deleteNoteDraft('u1');
  assert.equal(await freshService.getNoteDraft('u1'), undefined);
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

test('workspace export and import preserve dismissed relation decisions', async () => {
  const source = buildService();
  await source.service.materializeGraph('org1');
  const pmSnapshot = await source.service.getWorkspace('u3');
  const relation = pmSnapshot.relations.find(item => item.type === 'contradiction');
  assert(relation);

  await source.service.updateRelation('u3', relation.id, {
    reviewStatus: 'dismissed' satisfies RelationReviewStatus,
    reviewNote: 'Dismissed for restore regression.'
  });

  const exported = await source.service.exportWorkspace('u3');
  assert(exported.reviewedRelations.some(item => item.id === relation.id && item.reviewStatus === 'dismissed'));

  const targetRepository = createMemoryWorkspaceRepository();
  targetRepository.seed({ organizationId: 'org2', users, notes: [] });
  const targetService = createWorkspaceService(targetRepository);

  const restored = await targetService.importWorkspace('u3', exported satisfies WorkspaceExport);

  assert(!restored.relations.some(item => item.id === relation.id));
  assert(targetRepository.relations.some(item => (
    item.id === relation.id
    && item.orgId === 'org2'
    && item.reviewStatus === 'dismissed'
    && item.reviewNote === 'Dismissed for restore regression.'
  )));
});

test('workspace import does not apply reviewed relation state to pre-existing notes', async () => {
  const targetRepository = createMemoryWorkspaceRepository();
  targetRepository.seed({ organizationId: 'org1', users, notes });
  const targetService = createWorkspaceService(targetRepository);
  await targetService.materializeGraph('org1');
  const existingSnapshot = await targetService.getWorkspace('u3');
  const existingRelation = existingSnapshot.relations.find(item => item.type === 'contradiction');
  assert(existingRelation);

  const maliciousExport: WorkspaceExport = {
    kind: 'mycelium.workspace.v1',
    exportedAt: new Date().toISOString(),
    snapshot: existingSnapshot,
    reviewedRelations: [{
      ...existingRelation,
      reviewStatus: 'dismissed',
      reviewNote: 'Should not apply to existing workspace.'
    }]
  };

  await targetService.importWorkspace('u3', maliciousExport);

  assert(targetRepository.relations.some(item => (
    item.id === existingRelation.id
    && item.reviewStatus === 'open'
    && item.reviewNote === undefined
  )));
});
