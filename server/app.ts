import cors from '@fastify/cors';
import fastify, { type FastifyRequest } from 'fastify';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CreateNoteInput,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  NoteDraft,
  NoteRevision,
  UpdateClaimInput,
  UpdateNoteInput,
  UpdateRelationInput,
  UpsertNoteDraftInput,
  WorkspaceExport,
  WorkspaceSnapshot
} from './workspace-service';

export interface WorkspaceServiceApi {
  getWorkspace(viewerId: string): Promise<WorkspaceSnapshot>;
  getDashboard(viewerId: string, options: { scope?: DashboardScope; range?: DashboardRange; teamId?: string }): Promise<DashboardSnapshot>;
  exportWorkspace(viewerId: string): Promise<WorkspaceExport>;
  importWorkspace(viewerId: string, input: WorkspaceExport): Promise<WorkspaceSnapshot>;
  createNote(viewerId: string, input: CreateNoteInput): Promise<WorkspaceSnapshot>;
  updateNote(viewerId: string, noteId: string, input: UpdateNoteInput): Promise<WorkspaceSnapshot>;
  getNoteDraft(viewerId: string): Promise<NoteDraft | undefined>;
  upsertNoteDraft(viewerId: string, input: UpsertNoteDraftInput): Promise<NoteDraft>;
  deleteNoteDraft(viewerId: string): Promise<void>;
  listNoteHistory(viewerId: string, noteId: string): Promise<NoteRevision[]>;
  updateClaim(viewerId: string, claimId: string, input: UpdateClaimInput): Promise<WorkspaceSnapshot>;
  updateRelation(viewerId: string, relationId: string, input: UpdateRelationInput): Promise<WorkspaceSnapshot>;
}

export interface BuildAppOptions {
  service: WorkspaceServiceApi;
  resolveUserId: (request: FastifyRequest) => Promise<string | undefined>;
  authConfig: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
  staticRoot?: string;
}

export function buildApp(options: BuildAppOptions) {
  const app = fastify({ logger: false });

  app.register(cors, { origin: true, credentials: true });

  app.get('/api/session/bootstrap', async () => ({
    supabaseUrl: options.authConfig.supabaseUrl,
    supabaseAnonKey: options.authConfig.supabaseAnonKey
  }));

  app.get('/api/workspace', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.getWorkspace(viewerId);
  });

  app.get<{ Querystring: { scope?: DashboardScope; range?: DashboardRange; teamId?: string } }>('/api/dashboard', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.getDashboard(viewerId, request.query);
  });

  app.get('/api/workspace/export', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.exportWorkspace(viewerId);
  });

  app.post<{ Body: WorkspaceExport }>('/api/workspace/import', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.importWorkspace(viewerId, request.body);
  });

  app.post<{ Body: CreateNoteInput }>('/api/notes', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.createNote(viewerId, request.body);
  });

  app.patch<{ Params: { id: string }; Body: UpdateNoteInput }>('/api/notes/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.updateNote(viewerId, request.params.id, request.body);
  });

  app.get('/api/note-draft', async request => {
    const viewerId = await requireViewerId(options, request);
    return { draft: await options.service.getNoteDraft(viewerId) ?? null };
  });

  app.put<{ Body: UpsertNoteDraftInput }>('/api/note-draft', async request => {
    const viewerId = await requireViewerId(options, request);
    return { draft: await options.service.upsertNoteDraft(viewerId, request.body) };
  });

  app.delete('/api/note-draft', async request => {
    const viewerId = await requireViewerId(options, request);
    await options.service.deleteNoteDraft(viewerId);
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/notes/:id/history', async request => {
    const viewerId = await requireViewerId(options, request);
    return { history: await options.service.listNoteHistory(viewerId, request.params.id) };
  });

  app.patch<{ Params: { id: string }; Body: UpdateClaimInput }>('/api/claims/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.updateClaim(viewerId, request.params.id, request.body);
  });

  app.patch<{ Params: { id: string }; Body: UpdateRelationInput }>('/api/relations/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.updateRelation(viewerId, request.params.id, request.body);
  });

  app.get('/api/audit-events', async request => {
    const viewerId = await requireViewerId(options, request);
    const workspace = await options.service.getWorkspace(viewerId);
    return { auditEvents: workspace.auditEvents };
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? (error.message.includes('not accessible') || error.message.includes('not available') || error.message.includes('Only the note author') ? 403 : 500);
    reply.status(statusCode).send({ error: error.message });
  });

  if (options.staticRoot && existsSync(options.staticRoot)) {
    app.register(staticFiles, {
      root: options.staticRoot,
      prefix: '/'
    });
    app.setNotFoundHandler((_request, reply) => {
      reply.sendFile('index.html');
    });
  }

  return app;
}

async function requireViewerId(options: BuildAppOptions, request: FastifyRequest): Promise<string> {
  const viewerId = await options.resolveUserId(request);
  if (!viewerId) {
    const error = new Error('Authentication required') as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }
  return viewerId;
}

export function defaultStaticRoot() {
  return join(process.cwd(), 'dist');
}
