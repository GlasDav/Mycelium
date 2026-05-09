import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ClaimReviewStatus,
  CreateNoteInput,
  NoteDraft,
  NoteRevision,
  RelationReviewStatus,
  UpdateClaimInput,
  UpdateNoteInput,
  UpdateRelationInput,
  UpsertNoteDraftInput,
  WorkspaceSnapshot
} from '../server/workspace-service';
import type { RelationType } from './engine';

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

export async function loadWorkspace(session: Session): Promise<WorkspaceSnapshot> {
  const response = await fetch('/api/workspace', { headers: authHeaders(session) });
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
