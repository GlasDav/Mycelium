import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminOrganizationSnapshot,
  AudioImportJob,
  ClaimReviewStatus,
  CreateNoteInput,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  OrganizationInvite,
  OrganizationTeam,
  NoteDraft,
  NoteRevision,
  RelationReviewStatus,
  TranscriptChunkRecord,
  UpdateClaimInput,
  UpdateNoteInput,
  UpdateRelationInput,
  UpsertNoteDraftInput,
  WorkspaceOptions,
  WorkspaceSnapshot
} from '../server/workspace-service';
import type { AccessScope, OrgRole, Role, TeamStatus, UserStatus, RelationType } from './engine';

export interface AuthBootstrap {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export async function loadAuthBootstrap(): Promise<AuthBootstrap> {
  const response = await fetch('/api/session/bootstrap');
  return readJson(response);
}

export function createAuthClient(config: AuthBootstrap): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}

export async function loadWorkspace(session: Session, input: WorkspaceOptions = {}): Promise<WorkspaceSnapshot> {
  const params = new URLSearchParams();
  if (input.asOf) params.set('asOf', input.asOf);
  const query = params.toString();
  const response = await fetch(`/api/workspace${query ? `?${query}` : ''}`, { headers: authHeaders(session) });
  return readJson(response);
}

export async function loadDashboard(
  session: Session,
  input: { scope?: DashboardScope; range?: DashboardRange; teamId?: string } = {}
): Promise<DashboardSnapshot> {
  const params = new URLSearchParams();
  if (input.scope) params.set('scope', input.scope);
  if (input.range) params.set('range', input.range);
  if (input.teamId) params.set('teamId', input.teamId);
  const query = params.toString();
  const response = await fetch(`/api/dashboard${query ? `?${query}` : ''}`, { headers: authHeaders(session) });
  return readJson(response);
}

export async function createNote(session: Session, input: CreateNoteInput): Promise<WorkspaceSnapshot> {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function updateNote(session: Session, id: string, input: UpdateNoteInput): Promise<WorkspaceSnapshot> {
  const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export interface AudioImportJobResponse {
  job: AudioImportJob;
  transcriptChunks: TranscriptChunkRecord[];
}

export async function createAudioImportJob(
  session: Session,
  file: File,
  input: {
    consentConfirmed: boolean;
    accessScope?: AccessScope;
    teamId?: string;
    selectedNoteId?: string;
    language?: string;
  }
): Promise<AudioImportJobResponse> {
  const form = new FormData();
  form.set('file', file);
  form.set('consentConfirmed', input.consentConfirmed ? 'true' : 'false');
  if (input.accessScope) form.set('accessScope', input.accessScope);
  if (input.teamId) form.set('teamId', input.teamId);
  if (input.selectedNoteId) form.set('selectedNoteId', input.selectedNoteId);
  if (input.language) form.set('language', input.language);
  const response = await fetch('/api/audio-import-jobs', {
    method: 'POST',
    headers: authHeaders(session),
    body: form
  });
  return readJson(response);
}

export async function loadAudioImportJob(session: Session, id: string): Promise<AudioImportJobResponse> {
  const response = await fetch(`/api/audio-import-jobs/${encodeURIComponent(id)}`, { headers: authHeaders(session) });
  return readJson(response);
}

export async function loadNoteTranscriptChunks(session: Session, id: string): Promise<TranscriptChunkRecord[]> {
  const response = await fetch(`/api/notes/${encodeURIComponent(id)}/transcript-chunks`, { headers: authHeaders(session) });
  const body = await readJson<{ transcriptChunks: TranscriptChunkRecord[] }>(response);
  return body.transcriptChunks;
}

export async function loadNoteDraft(session: Session): Promise<NoteDraft | null> {
  const response = await fetch('/api/note-draft', { headers: authHeaders(session) });
  const body = await readJson<{ draft: NoteDraft | null }>(response);
  return body.draft;
}

export async function upsertNoteDraft(session: Session, input: UpsertNoteDraftInput): Promise<NoteDraft> {
  const response = await fetch('/api/note-draft', {
    method: 'PUT',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  const body = await readJson<{ draft: NoteDraft }>(response);
  return body.draft;
}

export async function deleteNoteDraft(session: Session): Promise<void> {
  const response = await fetch('/api/note-draft', {
    method: 'DELETE',
    headers: authHeaders(session)
  });
  await readJson<{ ok: boolean }>(response);
}

export async function loadNoteHistory(session: Session, id: string): Promise<NoteRevision[]> {
  const response = await fetch(`/api/notes/${encodeURIComponent(id)}/history`, { headers: authHeaders(session) });
  const body = await readJson<{ history: NoteRevision[] }>(response);
  return body.history;
}

export async function updateClaim(session: Session, id: string, input: UpdateClaimInput & { reviewStatus?: ClaimReviewStatus }): Promise<WorkspaceSnapshot> {
  const response = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function updateRelation(
  session: Session,
  id: string,
  input: UpdateRelationInput & { reviewStatus?: RelationReviewStatus; type?: RelationType }
): Promise<WorkspaceSnapshot> {
  const response = await fetch(`/api/relations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function loadAdminOrganization(session: Session): Promise<AdminOrganizationSnapshot> {
  const response = await fetch('/api/admin/organization', { headers: authHeaders(session) });
  return readJson(response);
}

export async function createAdminTeam(session: Session, input: { name: string; sectorFocus?: string }): Promise<OrganizationTeam> {
  const response = await fetch('/api/admin/teams', {
    method: 'POST',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function updateAdminTeam(session: Session, id: string, input: { name?: string; sectorFocus?: string; status?: TeamStatus }): Promise<OrganizationTeam> {
  const response = await fetch(`/api/admin/teams/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function archiveAdminTeam(session: Session, id: string): Promise<OrganizationTeam> {
  const response = await fetch(`/api/admin/teams/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(session)
  });
  return readJson(response);
}

export async function createAdminInvite(session: Session, input: { email: string; role: Role; orgRole: OrgRole; teamIds?: string[] }): Promise<OrganizationInvite> {
  const response = await fetch('/api/admin/invites', {
    method: 'POST',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function cancelAdminInvite(session: Session, id: string): Promise<OrganizationInvite> {
  const response = await fetch(`/api/admin/invites/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' })
  });
  return readJson(response);
}

export async function updateAdminMember(session: Session, id: string, input: { role?: Role; orgRole?: OrgRole; status?: UserStatus; primaryTeamId?: string | null }) {
  const response = await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function replaceAdminMemberTeams(session: Session, id: string, teamIds: string[]) {
  const response = await fetch(`/api/admin/members/${encodeURIComponent(id)}/teams`, {
    method: 'PUT',
    headers: { ...authHeaders(session), 'content-type': 'application/json' },
    body: JSON.stringify({ teamIds })
  });
  return readJson(response);
}

function authHeaders(session: Session) {
  return { authorization: `Bearer ${session.access_token}` };
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }
  return body as T;
}
