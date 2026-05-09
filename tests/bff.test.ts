import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryWorkspaceRepository, createWorkspaceService } from '../server/workspace-service';
import { buildApp } from '../server/app';
import type { Note, User } from '../src/engine';

const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis' },
  { id: 'u2', name: 'Priya Shah', role: 'PM', team: 'Portfolio' }
];

const notes: Note[] = [
  {
    id: 'n1',
    title: 'bull',
    body: 'Nvidia demand is strong and GPU supply is tight.',
    authorId: 'u1',
    team: 'Semis',
    visibility: 'team',
    sourceType: 'Channel check',
    createdAt: '2026-05-01',
    observedAt: '2026-05-01',
    appliesToStart: '2026-05-01',
    appliesToEnd: '2026-08-01',
    horizon: 'near_term'
  }
];

function buildTestApp() {
  const repository = createMemoryWorkspaceRepository();
  repository.seed({ organizationId: 'org1', users, notes });
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

test('BFF creates notes and patches claim/relation reviews', async () => {
  const { app } = buildTestApp();

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
      horizon: 'near_term'
    }
  });
  assert.equal(created.statusCode, 200);
  const createdBody = created.json();
  const claim = createdBody.claims.find((item: { text: string }) => item.text.includes('weak'));
  const relation = createdBody.relations.find((item: { type: string }) => item.type === 'contradiction');
  assert(claim);
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
      reviewNote: 'BFF claim review note.'
    }
  });
  assert.equal(claimUpdate.statusCode, 200);
  assert(claimUpdate.json().claims.some((item: { id: string; reviewStatus: string; reviewNote: string }) => {
    return item.id === claim.id && item.reviewStatus === 'analyst_rejected' && item.reviewNote === 'BFF claim review note.';
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
      kpis: ['demand']
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
