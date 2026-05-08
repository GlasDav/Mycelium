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
