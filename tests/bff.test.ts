import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryWorkspaceRepository, createWorkspaceService } from '../server/workspace-service';
import { buildApp } from '../server/app';
import type { Note, User } from '../src/engine';

const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis', teamId: 'team-semis', primaryTeamId: 'team-semis', orgRole: 'member', status: 'active', teamMemberships: [{ teamId: 'team-semis', teamName: 'Semis', role: 'member', status: 'active' }] },
  { id: 'u2', name: 'Priya Shah', role: 'PM', team: 'Portfolio', teamId: 'team-portfolio', primaryTeamId: 'team-portfolio', orgRole: 'admin', status: 'active', teamMemberships: [{ teamId: 'team-portfolio', teamName: 'Portfolio', role: 'member', status: 'active' }] }
];

const notes: Note[] = [
  {
    id: 'n1',
    title: 'bull',
    body: 'Nvidia demand is strong and GPU supply is tight.',
    authorId: 'u1',
    team: 'Semis',
    teamId: 'team-semis',
    visibility: 'team',
    accessScope: 'team',
    sourceType: 'Channel check',
    createdAt: '2026-05-01',
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-01',
    horizon: 'near_term'
  }
];

function buildTestApp(inputNotes: Note[] = notes) {
  const repository = createMemoryWorkspaceRepository();
  repository.seed({ organizationId: 'org1', users, notes: inputNotes });
  const service = createWorkspaceService(repository);
  const app = buildApp({
    service,
    resolveUserId: async request => request.headers.authorization?.replace(/^Bearer\s+/i, '') || undefined,
    authConfig: { supabaseUrl: 'http://localhost:55321', supabaseAnonKey: 'anon-test-key' }
  });
  return { app, repository };
}

test('BFF requires auth and returns the permission-filtered workspace', async () => {
  const { app } = buildTestApp();

  const unauthorized = await app.inject({ method: 'GET', url: '/api/workspace' });
  assert.equal(unauthorized.statusCode, 401);

  const response = await app.inject({ method: 'GET', url: '/api/workspace', headers: { authorization: 'Bearer u1' } });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.viewer.id, 'u1');
  assert.equal(body.visibleNotes.length, 1);
});

test('BFF returns historical workspace snapshots from the asOf query', async () => {
  const { app } = buildTestApp([
    ...notes,
    {
      ...notes[0],
      id: 'n2',
      title: 'future bear',
      body: 'Nvidia demand is weak as GPU supply slows.',
      createdAt: '2026-06-01',
      observedAt: '2026-06-01',
      appliesToStart: '2026-06-01',
      appliesToEnd: '2026-09-01'
    }
  ]);

  const early = await app.inject({
    method: 'GET',
    url: '/api/workspace?asOf=2026-05-15',
    headers: { authorization: 'Bearer u2' }
  });
  assert.equal(early.statusCode, 200);
  assert.equal(early.json().asOf, '2026-05-15');
  assert(!early.json().claims.some((claim: { noteId: string }) => claim.noteId === 'n2'));
  assert.equal(early.json().relations.length, 0);

  const later = await app.inject({
    method: 'GET',
    url: '/api/workspace?asOf=2026-06-15',
    headers: { authorization: 'Bearer u2' }
  });
  assert.equal(later.statusCode, 200);
  assert(later.json().claims.some((claim: { noteId: string }) => claim.noteId === 'n2'));
  assert(later.json().relations.some((relation: { type: string }) => relation.type === 'contradiction'));
});

test('BFF rejects invalid workspace asOf query dates', async () => {
  const { app } = buildTestApp();

  const response = await app.inject({
    method: 'GET',
    url: '/api/workspace?asOf=not-a-date',
    headers: { authorization: 'Bearer u1' }
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().error, /asOf/);
});

test('BFF serves scoped dashboard aggregates with role-gated org access', async () => {
  const { app } = buildTestApp();

  const workspace = await app.inject({
    method: 'GET',
    url: '/api/dashboard?scope=workspace&range=90d',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(workspace.statusCode, 200);
  assert.equal(workspace.json().scope, 'workspace');
  assert.equal(workspace.json().range, '90d');
  assert.equal(workspace.json().totals.notes, 1);
  assert.equal(workspace.json().scopeAvailability.find((item: { scope: string }) => item.scope === 'org').enabled, false);

  const denied = await app.inject({
    method: 'GET',
    url: '/api/dashboard?scope=org&range=90d',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(denied.statusCode, 403);
  assert.match(denied.json().error, /Dashboard scope org is not available/);

  const org = await app.inject({
    method: 'GET',
    url: '/api/dashboard?scope=org&range=all',
    headers: { authorization: 'Bearer u2' }
  });
  assert.equal(org.statusCode, 200);
  assert.equal(org.json().scope, 'org');
});

test('BFF creates notes and patches claim/relation reviews', async () => {
  const { app } = buildTestApp();
  const linkedEntities = [
    { type: 'security', role: 'security', key: 'nvda', name: 'NVDA', externalIds: { ticker: 'NVDA' } },
    { type: 'industry', role: 'industry', key: 'semiconductors', name: 'Semiconductors' },
    { type: 'source_person', role: 'source_person', key: 'dana-lee', name: 'Dana Lee' }
  ];

  const created = await app.inject({
    method: 'POST',
    url: '/api/notes',
    headers: { authorization: 'Bearer u1' },
    payload: {
      body: 'Nvidia demand is weak as GPU supply slows.',
      visibility: 'team',
      sourceType: 'Expert call',
      observedAt: '2026-05-02',
      appliesToStart: '2026-05-02',
      appliesToEnd: '2026-08-02',
      horizon: 'near_term',
      linkedEntities
    }
  });
  assert.equal(created.statusCode, 200);
  const createdBody = created.json();
  const createdNote = createdBody.visibleNotes.find((item: { title: string }) => item.title.includes('Research intake'));
  assert.deepEqual(createdNote.linkedEntities.map((item: { name: string }) => item.name), ['NVDA', 'Semiconductors', 'Dana Lee']);
  const claim = createdBody.claims.find((item: { text: string }) => item.text.includes('weak'));
  const relation = createdBody.relations.find((item: { type: string }) => item.type === 'contradiction');
  assert(claim);
  assert.deepEqual(claim.sourcePeople, ['Dana Lee']);
  assert(relation);

  const relationUpdate = await app.inject({
    method: 'PATCH',
    url: `/api/relations/${encodeURIComponent(relation.id)}`,
    headers: { authorization: 'Bearer u1' },
    payload: {
      reviewStatus: 'reclassified',
      type: 'historical_tension',
      reviewNote: 'BFF relation review note.'
    }
  });
  assert.equal(relationUpdate.statusCode, 200);
  assert(relationUpdate.json().relations.some((item: { id: string; reviewNote: string; type: string }) => {
    return item.id === relation.id && item.type === 'historical_tension' && item.reviewNote === 'BFF relation review note.';
  }));

  const claimUpdate = await app.inject({
    method: 'PATCH',
    url: `/api/claims/${encodeURIComponent(claim.id)}`,
    headers: { authorization: 'Bearer u1' },
    payload: {
      reviewStatus: 'analyst_rejected',
      reviewNote: 'BFF claim review note.',
      sourcePeople: ['Ravi Patel']
    }
  });
  assert.equal(claimUpdate.statusCode, 200);
  assert(claimUpdate.json().claims.some((item: { id: string; reviewStatus: string; reviewNote: string; sourcePeople: string[] }) => {
    return item.id === claim.id && item.reviewStatus === 'analyst_rejected' && item.reviewNote === 'BFF claim review note.' && item.sourcePeople.includes('Ravi Patel');
  }));
});

test('BFF updates notes, exposes history, and reloads persisted review state', async () => {
  const { app } = buildTestApp();

  const created = await app.inject({
    method: 'POST',
    url: '/api/notes',
    headers: { authorization: 'Bearer u1' },
    payload: {
      title: 'weak follow-up',
      body: 'Nvidia demand is weak as GPU supply slows.',
      visibility: 'team',
      observedAt: '2026-05-02'
    }
  });
  assert.equal(created.statusCode, 200);
  const createdBody = created.json();
  const createdNote = createdBody.visibleNotes.find((item: { title: string }) => item.title === 'weak follow-up');
  const claim = createdBody.claims.find((item: { noteId: string }) => item.noteId === createdNote.id);
  const relation = createdBody.relations.find((item: { id: string }) => item.id);
  assert(createdNote);
  assert(claim);
  assert(relation);

  await app.inject({
    method: 'PATCH',
    url: `/api/claims/${encodeURIComponent(claim.id)}`,
    headers: { authorization: 'Bearer u1' },
    payload: { reviewStatus: 'analyst_confirmed', reviewNote: 'Confirmed before rename.' }
  });
  await app.inject({
    method: 'PATCH',
    url: `/api/relations/${encodeURIComponent(relation.id)}`,
    headers: { authorization: 'Bearer u1' },
    payload: { reviewStatus: 'reclassified', type: 'historical_tension', reviewNote: 'Rename should preserve this.' }
  });

  const forbidden = await app.inject({
    method: 'PATCH',
    url: `/api/notes/${encodeURIComponent(createdNote.id)}`,
    headers: { authorization: 'Bearer u2' },
    payload: { title: 'PM rewrite' }
  });
  assert.equal(forbidden.statusCode, 403);

  const updated = await app.inject({
    method: 'PATCH',
    url: `/api/notes/${encodeURIComponent(createdNote.id)}`,
    headers: { authorization: 'Bearer u1' },
    payload: { title: 'renamed weak follow-up' }
  });
  assert.equal(updated.statusCode, 200);

  const history = await app.inject({
    method: 'GET',
    url: `/api/notes/${encodeURIComponent(createdNote.id)}/history`,
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(history.statusCode, 200);
  assert.equal(history.json().history[0].previousTitle, 'weak follow-up');

  const reloaded = await app.inject({
    method: 'GET',
    url: '/api/workspace',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(reloaded.statusCode, 200);
  const reloadBody = reloaded.json();
  assert(reloadBody.visibleNotes.some((item: { id: string; title: string }) => item.id === createdNote.id && item.title === 'renamed weak follow-up'));
  assert(reloadBody.claims.some((item: { id: string; reviewStatus: string; reviewNote: string }) => item.id === claim.id && item.reviewStatus === 'analyst_confirmed' && item.reviewNote === 'Confirmed before rename.'));
  assert(reloadBody.relations.some((item: { id: string; reviewStatus: string; reviewNote: string }) => item.id === relation.id && item.reviewStatus === 'reclassified' && item.reviewNote === 'Rename should preserve this.'));
});

test('BFF note draft routes persist and clear the recoverable workbench draft', async () => {
  const { app } = buildTestApp();

  const unauthorized = await app.inject({ method: 'GET', url: '/api/note-draft' });
  assert.equal(unauthorized.statusCode, 401);

  const empty = await app.inject({
    method: 'GET',
    url: '/api/note-draft',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(empty.statusCode, 200);
  assert.equal(empty.json().draft, null);

  const saved = await app.inject({
    method: 'PUT',
    url: '/api/note-draft',
    headers: { authorization: 'Bearer u1' },
    payload: {
      selectedNoteId: 'n1',
      title: 'Draft title',
      body: 'Draft note body',
      visibility: 'private',
      observedAt: '2026-05-07',
      tickers: ['NVDA'],
      manualThemes: ['AI infrastructure'],
      kpis: ['demand'],
      linkedEntities: [
        { type: 'source_person', role: 'source_person', key: 'dana-lee', name: 'Dana Lee' },
        { type: 'watchlist', role: 'watchlist', key: 'ai-capex', name: 'AI Capex' }
      ]
    }
  });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().draft.title, 'Draft title');

  const loaded = await app.inject({
    method: 'GET',
    url: '/api/note-draft',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(loaded.statusCode, 200);
  assert.deepEqual(loaded.json().draft.tickers, ['NVDA']);
  assert.deepEqual(loaded.json().draft.sourcePeople, ['Dana Lee']);
  assert.deepEqual(loaded.json().draft.watchlistTags, ['AI Capex']);

  const deleted = await app.inject({
    method: 'DELETE',
    url: '/api/note-draft',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(deleted.statusCode, 200);

  const afterDelete = await app.inject({
    method: 'GET',
    url: '/api/note-draft',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(afterDelete.json().draft, null);
});

test('BFF exports and imports workspace JSON with auth required', async () => {
  const source = buildTestApp();

  const unauthorizedExport = await source.app.inject({ method: 'GET', url: '/api/workspace/export' });
  assert.equal(unauthorizedExport.statusCode, 401);

  const exported = await source.app.inject({
    method: 'GET',
    url: '/api/workspace/export',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(exported.statusCode, 200);
  const exportBody = exported.json();
  assert.equal(exportBody.kind, 'mycelium.workspace.v1');
  assert.deepEqual(exportBody.snapshot.visibleNotes.map((note: { id: string }) => note.id), ['n1']);

  const targetRepository = createMemoryWorkspaceRepository();
  targetRepository.seed({ organizationId: 'org1', users, notes: [] });
  const targetService = createWorkspaceService(targetRepository);
  const targetApp = buildApp({
    service: targetService,
    resolveUserId: async request => request.headers.authorization?.replace(/^Bearer\s+/i, '') || undefined,
    authConfig: { supabaseUrl: 'http://localhost:55321', supabaseAnonKey: 'anon-test-key' }
  });

  const unauthorizedImport = await targetApp.inject({
    method: 'POST',
    url: '/api/workspace/import',
    payload: exportBody
  });
  assert.equal(unauthorizedImport.statusCode, 401);

  const imported = await targetApp.inject({
    method: 'POST',
    url: '/api/workspace/import',
    headers: { authorization: 'Bearer u1' },
    payload: exportBody
  });
  assert.equal(imported.statusCode, 200);
  const importedBody = imported.json();
  assert.equal(importedBody.viewer.id, 'u1');
  assert.deepEqual(importedBody.visibleNotes.map((note: { id: string }) => note.id), ['n1']);
  assert(importedBody.claims.some((claim: { noteId: string }) => claim.noteId === 'n1'));
});

test('BFF exposes organization admin lifecycle routes and rejects non-admin callers', async () => {
  const { app } = buildTestApp();

  const forbidden = await app.inject({
    method: 'GET',
    url: '/api/admin/organization',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(forbidden.statusCode, 403);

  const organization = await app.inject({
    method: 'GET',
    url: '/api/admin/organization',
    headers: { authorization: 'Bearer u2' }
  });
  assert.equal(organization.statusCode, 200);
  assert(organization.json().members.some((member: { id: string }) => member.id === 'u1'));

  const createdTeam = await app.inject({
    method: 'POST',
    url: '/api/admin/teams',
    headers: { authorization: 'Bearer u2' },
    payload: { name: 'Healthcare' }
  });
  assert.equal(createdTeam.statusCode, 200);
  const teamId = createdTeam.json().id;

  const renamedTeam = await app.inject({
    method: 'PATCH',
    url: `/api/admin/teams/${teamId}`,
    headers: { authorization: 'Bearer u2' },
    payload: { name: 'Health Care' }
  });
  assert.equal(renamedTeam.statusCode, 200);
  assert.equal(renamedTeam.json().name, 'Health Care');

  const archivedTeam = await app.inject({
    method: 'DELETE',
    url: `/api/admin/teams/${teamId}`,
    headers: { authorization: 'Bearer u2' }
  });
  assert.equal(archivedTeam.statusCode, 200);
  assert.equal(archivedTeam.json().status, 'archived');

  const invite = await app.inject({
    method: 'POST',
    url: '/api/admin/invites',
    headers: { authorization: 'Bearer u2' },
    payload: {
      email: 'new.analyst@example.test',
      role: 'Analyst',
      orgRole: 'member',
      teamIds: ['team-semis']
    }
  });
  assert.equal(invite.statusCode, 200);

  const cancelledInvite = await app.inject({
    method: 'PATCH',
    url: `/api/admin/invites/${invite.json().id}`,
    headers: { authorization: 'Bearer u2' },
    payload: { status: 'cancelled' }
  });
  assert.equal(cancelledInvite.statusCode, 200);
  assert.equal(cancelledInvite.json().status, 'cancelled');

  const updatedMember = await app.inject({
    method: 'PATCH',
    url: '/api/admin/members/u1',
    headers: { authorization: 'Bearer u2' },
    payload: { orgRole: 'admin' }
  });
  assert.equal(updatedMember.statusCode, 200);
  assert.equal(updatedMember.json().orgRole, 'admin');

  const teams = await app.inject({
    method: 'PUT',
    url: '/api/admin/members/u1/teams',
    headers: { authorization: 'Bearer u2' },
    payload: { teamIds: ['team-semis', 'team-portfolio'] }
  });
  assert.equal(teams.statusCode, 200);
  assert(teams.json().teamMemberships.some((team: { teamId: string }) => team.teamId === 'team-portfolio'));

  const deactivated = await app.inject({
    method: 'PATCH',
    url: '/api/admin/members/u1',
    headers: { authorization: 'Bearer u2' },
    payload: { status: 'deactivated' }
  });
  assert.equal(deactivated.statusCode, 200);

  const blockedWorkspace = await app.inject({
    method: 'GET',
    url: '/api/workspace',
    headers: { authorization: 'Bearer u1' }
  });
  assert.equal(blockedWorkspace.statusCode, 403);
});
