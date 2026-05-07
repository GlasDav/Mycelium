import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ClaimReviewStatus,
  CreateNoteInput,
  RelationReviewStatus,
  UpdateClaimInput,
  UpdateRelationInput,
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
