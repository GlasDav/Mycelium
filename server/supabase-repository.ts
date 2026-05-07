import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import type { FastifyRequest } from 'fastify';
import type { Claim, RelationType, User } from '../src/engine';
import type {
  AuditEvent,
  WorkspaceClaim,
  WorkspaceNote,
  WorkspaceRelation,
  WorkspaceRepository,
  WorkspaceUser
} from './workspace-service';

export interface SupabaseServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

export function readSupabaseServerConfig(env = process.env, envPath = '.env'): SupabaseServerConfig {
  const fileEnv = loadDotenv({ path: envPath, processEnv: {}, quiet: true }).parsed ?? {};
  const supabaseUrl = env.SUPABASE_URL ?? fileEnv.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? fileEnv.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
  }
  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

export function createSupabaseClients(config: SupabaseServerConfig) {
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return {
    serviceClient,
    authConfig: {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey
    },
    resolveUserId: async (request: FastifyRequest) => {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return undefined;
      const { data, error } = await serviceClient.auth.getUser(token);
      if (error || !data.user) return undefined;
      return data.user.id;
    }
  };
}

export function createSupabaseWorkspaceRepository(client: SupabaseClient): WorkspaceRepository {
  return {
    async getUser(userId) {
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return hydrateUser(client, data);
    },
    async listUsers(orgId) {
      const { data, error } = await client.from('profiles').select('*').eq('org_id', orgId);
      if (error) throw error;
      return Promise.all((data ?? []).map(row => hydrateUser(client, row)));
    },
    async listNotes(orgId) {
      const { data, error } = await client.from('notes').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapNoteFromRow);
    },
    async insertNote(note) {
      const teamId = note.teamId ?? await findTeamId(client, note.orgId, note.team);
      const { error } = await client.from('notes').insert(mapNoteToRow({ ...note, teamId }));
      if (error) throw error;
    },
    async listClaims(orgId) {
      const { data, error } = await client.from('claims').select('*').eq('org_id', orgId);
      if (error) throw error;
      return (data ?? []).map(mapClaimFromRow);
    },
    async replaceClaims(orgId, claims) {
      const rows = await Promise.all(claims.map(async claim => mapClaimToRow({ ...claim, teamId: claim.teamId ?? await findTeamId(client, claim.orgId, claim.team) })));
      if (rows.length) {
        const { error } = await client.from('claims').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      await deleteMissing(client, 'claims', orgId, claims.map(claim => claim.id));
    },
    async updateClaim(claim) {
      const { error } = await client.from('claims').update(mapClaimToRow(claim)).eq('id', claim.id);
      if (error) throw error;
    },
    async listRelations(orgId) {
      const [relationsResult, claims] = await Promise.all([
        client.from('relations').select('*').eq('org_id', orgId),
        this.listClaims(orgId)
      ]);
      if (relationsResult.error) throw relationsResult.error;
      const claimsById = new Map(claims.map(claim => [claim.id, claim]));
      return (relationsResult.data ?? []).flatMap(row => {
        const a = claimsById.get(row.claim_a_id);
        const b = claimsById.get(row.claim_b_id);
        return a && b ? [mapRelationFromRow(row, a, b)] : [];
      });
    },
    async replaceRelations(orgId, relations) {
      const rows = relations.map(mapRelationToRow);
      if (rows.length) {
        const { error } = await client.from('relations').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      await deleteMissing(client, 'relations', orgId, relations.map(relation => relation.id));
    },
    async updateRelation(relation) {
      const { error } = await client.from('relations').update(mapRelationToRow(relation)).eq('id', relation.id);
      if (error) throw error;
    },
    async addAuditEvent(event) {
      const { error } = await client.from('audit_events').insert(mapAuditToRow(event));
      if (error) throw error;
    },
    async listAuditEvents(orgId) {
      const { data, error } = await client.from('audit_events').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapAuditFromRow);
    }
  };
}

async function hydrateUser(client: SupabaseClient, profile: Record<string, any>): Promise<WorkspaceUser> {
  const { data } = await client
    .from('team_memberships')
    .select('team_id, teams(name)')
    .eq('user_id', profile.id)
    .limit(1)
    .maybeSingle();
  const teamName = data?.teams && !Array.isArray(data.teams) ? data.teams.name : 'Research';
  return {
    id: profile.id,
    orgId: profile.org_id,
    email: profile.email,
    name: profile.name,
    role: profile.role as User['role'],
    team: teamName,
    teamId: data?.team_id
  };
}

async function findTeamId(client: SupabaseClient, orgId: string, teamName: string): Promise<string> {
  const { data, error } = await client.from('teams').select('id').eq('org_id', orgId).eq('name', teamName).maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Team ${teamName} not found`);
  return data.id;
}

async function deleteMissing(client: SupabaseClient, table: string, orgId: string, ids: string[]): Promise<void> {
  let query = client.from(table).delete().eq('org_id', orgId);
  if (ids.length) {
    query = query.not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
  }
  const { error } = await query;
  if (error) throw error;
}

function mapNoteFromRow(row: Record<string, any>): WorkspaceNote {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    body: row.body,
    authorId: row.author_id,
    authorName: row.author_name,
    team: row.team_name,
    teamId: row.team_id,
    visibility: row.visibility,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    observedAt: row.observed_at,
    appliesToStart: row.applies_to_start,
    appliesToEnd: row.applies_to_end,
    horizon: row.horizon,
    tickers: row.tickers ?? [],
    manualThemes: row.manual_themes ?? [],
    kpis: row.kpis ?? []
  };
}

function mapNoteToRow(note: WorkspaceNote) {
  return {
    id: note.id,
    org_id: note.orgId,
    author_id: note.authorId,
    author_name: note.authorName,
    team_id: note.teamId,
    team_name: note.team,
    title: note.title,
    body: note.body,
    visibility: note.visibility,
    source_type: note.sourceType,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    observed_at: note.observedAt,
    applies_to_start: note.appliesToStart,
    applies_to_end: note.appliesToEnd,
    horizon: note.horizon,
    tickers: note.tickers ?? [],
    manual_themes: note.manualThemes ?? [],
    kpis: note.kpis ?? [],
    processing_status: 'processed'
  };
}

function mapClaimFromRow(row: Record<string, any>): WorkspaceClaim {
  return {
    id: row.id,
    orgId: row.org_id,
    noteId: row.note_id,
    subject: row.subject,
    text: row.claim_text,
    direction: row.direction,
    evidence: row.evidence,
    confidence: Number(row.confidence),
    themes: row.themes ?? [],
    createdAt: row.created_at,
    observedAt: row.observed_at,
    appliesToStart: row.applies_to_start,
    appliesToEnd: row.applies_to_end,
    horizon: row.horizon,
    freshness: row.freshness,
    authorId: row.author_id,
    authorName: row.author_name,
    team: row.team_name,
    teamId: row.team_id,
    visibility: row.visibility,
    reviewStatus: row.review_status,
    reviewNote: row.review_note,
    reviewerId: row.reviewer_id,
    updatedAt: row.updated_at
  };
}

function mapClaimToRow(claim: WorkspaceClaim) {
  return {
    id: claim.id,
    org_id: claim.orgId,
    note_id: claim.noteId,
    author_id: claim.authorId,
    author_name: claim.authorName,
    team_id: claim.teamId,
    team_name: claim.team,
    visibility: claim.visibility,
    subject: claim.subject,
    claim_text: claim.text,
    direction: claim.direction,
    evidence: claim.evidence,
    confidence: claim.confidence,
    themes: claim.themes,
    created_at: claim.createdAt,
    observed_at: claim.observedAt,
    applies_to_start: claim.appliesToStart,
    applies_to_end: claim.appliesToEnd,
    horizon: claim.horizon,
    freshness: claim.freshness,
    review_status: claim.reviewStatus,
    review_note: claim.reviewNote,
    reviewer_id: claim.reviewerId,
    updated_at: claim.updatedAt
  };
}

function mapRelationFromRow(row: Record<string, any>, a: WorkspaceClaim, b: WorkspaceClaim): WorkspaceRelation {
  return {
    id: row.id,
    orgId: row.org_id,
    type: row.relationship_type,
    originalType: row.original_type,
    a,
    b,
    reason: row.reason,
    score: Number(row.score),
    overlapDays: row.overlap_days,
    reviewStatus: row.review_status,
    reviewNote: row.review_note,
    reviewerId: row.reviewer_id,
    updatedAt: row.updated_at
  };
}

function mapRelationToRow(relation: WorkspaceRelation) {
  return {
    id: relation.id,
    org_id: relation.orgId,
    claim_a_id: relation.a.id,
    claim_b_id: relation.b.id,
    relationship_type: relation.type,
    original_type: relation.originalType,
    reason: relation.reason,
    score: relation.score,
    overlap_days: relation.overlapDays,
    review_status: relation.reviewStatus,
    review_note: relation.reviewNote,
    reviewer_id: relation.reviewerId,
    updated_at: relation.updatedAt
  };
}

function mapAuditFromRow(row: Record<string, any>): AuditEvent {
  return {
    id: row.id,
    orgId: row.org_id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

function mapAuditToRow(event: AuditEvent) {
  return {
    id: event.id.startsWith('audit-') ? undefined : event.id,
    org_id: event.orgId,
    actor_id: event.actorId === 'system' ? null : event.actorId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    metadata: event.metadata,
    created_at: event.createdAt
  };
}
