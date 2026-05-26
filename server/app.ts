import cors from '@fastify/cors';
import fastify, { type FastifyRequest } from 'fastify';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AudioImportJob,
  CreateExternalEvidenceInput,
  CreateNoteInput,
  CreateAudioImportJobInput,
  AdminOrganizationSnapshot,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  OrganizationInvite,
  OrganizationTeam,
  ExternalEvidenceListing,
  NoteDraft,
  NoteRevision,
  TranscriptChunkRecord,
  UpdateClaimInput,
  UpdateNoteInput,
  UpdateRelationInput,
  UpsertNoteDraftInput,
  WorkspaceExport,
  WorkspaceExternalEvidenceItem,
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
  createAudioImportJob(viewerId: string, input: CreateAudioImportJobInput): Promise<AudioImportJob>;
  getAudioImportJob(viewerId: string, jobId: string): Promise<AudioImportJob | undefined>;
  listAudioImportJobTranscriptChunks(viewerId: string, jobId: string): Promise<TranscriptChunkRecord[]>;
  listNoteTranscriptChunks(viewerId: string, noteId: string): Promise<TranscriptChunkRecord[]>;
  createExternalEvidenceItem(viewerId: string, input: CreateExternalEvidenceInput): Promise<WorkspaceExternalEvidenceItem>;
  listExternalEvidence(viewerId: string): Promise<ExternalEvidenceListing>;
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

  app.addContentTypeParser(/^multipart\/form-data\b/i, { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

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

  app.post('/api/audio-import-jobs', async request => {
    const viewerId = await requireViewerId(options, request);
    const input = audioImportInputFromMultipart(request);
    const job = await options.service.createAudioImportJob(viewerId, input);
    return {
      job,
      transcriptChunks: await options.service.listAudioImportJobTranscriptChunks(viewerId, job.id)
    };
  });

  app.get<{ Params: { id: string } }>('/api/audio-import-jobs/:id', async request => {
    const viewerId = await requireViewerId(options, request);
    const job = await options.service.getAudioImportJob(viewerId, request.params.id);
    if (!job) {
      const error = new Error(`Audio import job ${request.params.id} is not accessible`) as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return {
      job,
      transcriptChunks: await options.service.listAudioImportJobTranscriptChunks(viewerId, request.params.id)
    };
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

  app.get<{ Params: { id: string } }>('/api/notes/:id/transcript-chunks', async request => {
    const viewerId = await requireViewerId(options, request);
    return { transcriptChunks: await options.service.listNoteTranscriptChunks(viewerId, request.params.id) };
  });

  app.get('/api/external-evidence', async request => {
    const viewerId = await requireViewerId(options, request);
    return options.service.listExternalEvidence(viewerId);
  });

  app.post<{ Body: CreateExternalEvidenceInput }>('/api/external-evidence', async request => {
    const viewerId = await requireViewerId(options, request);
    const item = await options.service.createExternalEvidenceItem(viewerId, request.body);
    const listing = await options.service.listExternalEvidence(viewerId);
    return {
      item,
      events: listing.events.filter(event => event.evidenceItemId === item.id)
    };
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
      : error.message.includes('Invalid ')
      || error.message.includes(' is required')
      || error.message.includes(' must be ')
      ? 400
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

interface MultipartFilePart {
  name: string;
  filename: string;
  contentType: string;
  content: Buffer;
}

interface MultipartForm {
  fields: Record<string, string>;
  files: MultipartFilePart[];
}

const AUDIO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const supportedAudioExtensions = new Set(['mp3', 'm4a', 'wav', 'webm', 'mp4', 'aac']);

function audioImportInputFromMultipart(request: FastifyRequest): CreateAudioImportJobInput {
  const form = parseMultipartForm(request);
  if (form.fields.consentConfirmed !== 'true') {
    const error = new Error('Audio transcription consent must be confirmed before upload.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  const file = form.files.find(item => item.name === 'file');
  if (!file) {
    const error = new Error('Audio upload file is required.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  const extension = file.filename.trim().toLowerCase().match(/\.([^.]+)$/)?.[1] ?? '';
  if (!supportedAudioExtensions.has(extension)) {
    const error = new Error('Unsupported audio import file type. Choose a .mp3, .m4a, .wav, .webm, .mp4, or .aac file.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  validateAudioContentType(file.contentType);
  if (file.content.byteLength > AUDIO_UPLOAD_MAX_BYTES) {
    const error = new Error('Audio import file is too large. Choose a file up to 50 MB.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  const accessScope = parseAccessScopeField(form.fields.accessScope);
  const teamId = form.fields.teamId || undefined;
  if (accessScope === 'team' && !teamId) {
    const error = new Error('Team audio imports require a teamId.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  if (teamId && accessScope !== 'team') {
    const error = new Error('Audio import teamId is only valid for team access scope.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  return {
    fileName: file.filename,
    contentType: file.contentType || 'application/octet-stream',
    bytes: new Uint8Array(file.content),
    accessScope,
    teamId,
    selectedNoteId: form.fields.selectedNoteId || undefined,
    language: form.fields.language || undefined
  };
}

function validateAudioContentType(contentType: string): void {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (!normalized || normalized === 'application/octet-stream') return;
  if (normalized.startsWith('audio/') || normalized === 'video/mp4' || normalized === 'video/webm') return;
  const error = new Error('Unsupported audio import MIME content type.') as Error & { statusCode: number };
  error.statusCode = 400;
  throw error;
}

function parseMultipartForm(request: FastifyRequest): MultipartForm {
  const contentType = String(request.headers['content-type'] ?? '');
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1]
    ?? contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  const body = request.body;
  if (!boundary || !Buffer.isBuffer(body)) {
    const error = new Error('Multipart form-data audio upload is required.') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  const fields: Record<string, string> = {};
  const files: MultipartFilePart[] = [];
  const marker = Buffer.from(`--${boundary}`);
  const delimiter = Buffer.from(`\r\n--${boundary}`);
  let cursor = body.indexOf(marker);
  while (cursor >= 0) {
    cursor += marker.byteLength;
    if (body.subarray(cursor, cursor + 2).toString() === '--') break;
    if (body.subarray(cursor, cursor + 2).toString() === '\r\n') cursor += 2;

    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), cursor);
    if (headerEnd < 0) break;
    const headerText = body.subarray(cursor, headerEnd).toString('utf8');
    const contentStart = headerEnd + 4;
    const next = body.indexOf(delimiter, contentStart);
    if (next < 0) break;
    const content = body.subarray(contentStart, next);
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] ?? '';
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    const partContentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? '';
    if (name && filename != null) {
      files.push({ name, filename, contentType: partContentType, content });
    } else if (name) {
      fields[name] = content.toString('utf8');
    }
    cursor = next + 2;
  }
  return { fields, files };
}

function parseAccessScopeField(value: string | undefined): CreateAudioImportJobInput['accessScope'] {
  if (!value) return undefined;
  if (value === 'personal' || value === 'team' || value === 'organization') return value;
  const error = new Error('Invalid audio import access scope.') as Error & { statusCode: number };
  error.statusCode = 400;
  throw error;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function defaultStaticRoot() {
  return join(process.cwd(), 'dist');
}
