import cors from '@fastify/cors';
import fastify, { type FastifyRequest } from 'fastify';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CreateNoteInput,
  AdminOrganizationSnapshot,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  OrganizationInvite,
  OrganizationTeam,
  NoteDraft,
  NoteRevision,
  UpdateClaimInput,
  UpdateNoteInput,
  UpdateRelationInput,
  UpsertNoteDraftInput,
  WorkspaceExport,
  WorkspaceOptions,
  WorkspaceSnapshot
} from './workspace-service';
import type { OrgRole, Role, TeamStatus, User, UserStatus } from '../src/engine';

export interface WorkspaceServiceApi {
  getWorkspace(viewerId: string, options?: WorkspaceOptions): Promise<WorkspaceSnapshot>;
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
  getAdminOrganization(viewerId: string): Promise<AdminOrganizationSnapshot>;
  createOrganizationTeam(viewerId: string, input: { name: string; sectorFocus?: string }): Promise<OrganizationTeam>;
  updateOrganizationTeam(viewerId: string, teamId: string, input: { name?: string; sectorFocus?: string; status?: TeamStatus }): Promise<OrganizationTeam>;
  archiveOrganizationTeam(viewerId: string, teamId: string): Promise<OrganizationTeam>;
  createOrganizationInvite(viewerId: string, input: { email: string; role: Role; orgRole: OrgRole; teamIds?: string[] }): Promise<OrganizationInvite>;
  cancelOrganizationInvite(viewerId: string, inviteId: string): Promise<OrganizationInvite>;
  updateOrganizationMember(viewerId: string, memberId: string, input: { role?: User['role']; orgRole?: OrgRole; status?: UserStatus; primaryTeamId?: string | null }): Promise<User>;
  replaceOrganizationMemberTeams(viewerId: string, memberId: string, teamIds: string[]): Promise<User>;
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

  app.get<{ Querystring: { asOf?: string } }>('/api/workspace', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.getWorkspace(viewerId, workspaceOptionsFromQuery(request.query));
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

  app.get('/api/admin/organization', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.getAdminOrganization(viewerId);
  });

  app.post<{ Body: { name: string; sectorFocus?: string } }>('/api/admin/teams', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.createOrganizationTeam(viewerId, request.body);
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; sectorFocus?: string; status?: TeamStatus } }>('/api/admin/teams/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.updateOrganizationTeam(viewerId, request.params.id, request.body);
  });

  app.delete<{ Params: { id: string } }>('/api/admin/teams/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.archiveOrganizationTeam(viewerId, request.params.id);
  });

  app.post<{ Body: { email: string; role: Role; orgRole: OrgRole; teamIds?: string[] } }>('/api/admin/invites', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.createOrganizationInvite(viewerId, request.body);
  });

  app.patch<{ Params: { id: string }; Body: { status?: 'cancelled' } }>('/api/admin/invites/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    if (request.body.status && request.body.status !== 'cancelled') throw new Error('Only invite cancellation is supported');
    return options.service.cancelOrganizationInvite(viewerId, request.params.id);
  });

  app.patch<{ Params: { id: string }; Body: { role?: Role; orgRole?: OrgRole; status?: UserStatus; primaryTeamId?: string | null } }>('/api/admin/members/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.updateOrganizationMember(viewerId, request.params.id, request.body);
  });

  app.put<{ Params: { id: string }; Body: { teamIds?: string[] } }>('/api/admin/members/:id/teams', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.replaceOrganizationMemberTeams(viewerId, request.params.id, request.body.teamIds ?? []);
  });

  app.get('/api/audit-events', async request => {
    const viewerId = await requireViewerId(options, request);
    const workspace = await options.service.getWorkspace(viewerId);
    return { auditEvents: workspace.auditEvents };
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? (
      error.message.includes('not accessible')
      || error.message.includes('not available')
      || error.message.includes('Only the note author')
      || error.message.includes('administrator')
      || error.message.includes('deactivated')
      ? 403
      : 500
    );
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

function workspaceOptionsFromQuery(query: { asOf?: string }): WorkspaceOptions {
  if (!query.asOf) return {};
  if (!isValidDateOnly(query.asOf)) {
    const error = new Error('Invalid asOf date. Use YYYY-MM-DD.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  return { asOf: query.asOf };
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function defaultStaticRoot() {
  return join(process.cwd(), 'dist');
}
