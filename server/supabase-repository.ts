import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import type { FastifyRequest } from 'fastify';
import type { Claim, RelationType, User } from '../src/engine';
import {
  legacyArraysToLinkedEntities,
  mergeLinkedEntities,
  metadataArraysFromLinkedEntities,
  normalizeLinkedEntities,
  type LinkedEntity
} from '../src/entity-links';
import type {
  AuditEvent,
  NoteDraft,
  NoteRevision,
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
      const [notesResult, noteLinks] = await Promise.all([
        client.from('notes').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
        listEntityLinks(client, orgId, 'note')
      ]);
      if (notesResult.error) throw notesResult.error;
      return (notesResult.data ?? []).map(row => mapNoteFromRow(row, noteLinks.get(row.id)));
    },
    async insertNote(note) {
      const teamId = note.teamId ?? await findTeamId(client, note.orgId, note.team);
      const { error } = await client.from('notes').insert(mapNoteToRow({ ...note, teamId }));
      if (error) throw error;
      await syncEntityLinks(client, note.orgId, 'note', note.id, note.linkedEntities);
    },
    async updateNote(note) {
      const { error } = await client.from('notes').update(mapNoteToRow(note)).eq('id', note.id);
      if (error) throw error;
      await syncEntityLinks(client, note.orgId, 'note', note.id, note.linkedEntities);
    },
    async insertNoteRevision(revision) {
      const { error } = await client.from('note_revisions').insert(mapNoteRevisionToRow(revision));
      if (error) throw error;
    },
    async listNoteRevisions(orgId, noteId) {
      const { data, error } = await client
        .from('note_revisions')
        .select('*')
        .eq('org_id', orgId)
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapNoteRevisionFromRow);
    },
    async getNoteDraft(orgId, userId) {
      const { data, error } = await client
        .from('note_drafts')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapNoteDraftFromRow(data) : undefined;
    },
    async upsertNoteDraft(draft) {
      const { error } = await client.from('note_drafts').upsert(mapNoteDraftToRow(draft), { onConflict: 'org_id,user_id' });
      if (error) throw error;
    },
    async deleteNoteDraft(orgId, userId) {
      const { error } = await client.from('note_drafts').delete().eq('org_id', orgId).eq('user_id', userId);
      if (error) throw error;
    },
    async listClaims(orgId) {
      const [claimsResult, claimLinks] = await Promise.all([
        client.from('claims').select('*').eq('org_id', orgId),
        listEntityLinks(client, orgId, 'claim')
      ]);
      if (claimsResult.error) throw claimsResult.error;
      return (claimsResult.data ?? []).map(row => mapClaimFromRow(row, claimLinks.get(row.id)));
    },
    async replaceClaims(orgId, claims) {
      const rows = await Promise.all(claims.map(async claim => mapClaimToRow({ ...claim, teamId: claim.teamId ?? await findTeamId(client, claim.orgId, claim.team) })));
      if (rows.length) {
        const { error } = await client.from('claims').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      for (const claim of claims) {
        await syncEntityLinks(client, claim.orgId, 'claim', claim.id, claim.linkedEntities);
      }
      await deleteMissing(client, 'claims', orgId, claims.map(claim => claim.id));
    },
    async updateClaim(claim) {
      const { error } = await client.from('claims').update(mapClaimToRow(claim)).eq('id', claim.id);
      if (error) throw error;
      await syncEntityLinks(client, claim.orgId, 'claim', claim.id, claim.linkedEntities);
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
  const team = data?.teams as { name?: string } | { name?: string }[] | undefined;
  const teamName = team && !Array.isArray(team) && team.name ? team.name : 'Research';
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

type LinkOwner = 'note' | 'claim';

async function listEntityLinks(client: SupabaseClient, orgId: string, owner: LinkOwner): Promise<Map<string, LinkedEntity[]>> {
  const table = owner === 'note' ? 'note_entity_links' : 'claim_entity_links';
  const ownerColumn = owner === 'note' ? 'note_id' : 'claim_id';
  const { data, error } = await client
    .from(table)
    .select(`${ownerColumn}, role, research_entities(id,type,key,name,aliases,external_ids)`)
    .eq('org_id', orgId);
  if (error) throw error;

  const links = new Map<string, LinkedEntity[]>();
  for (const rawRow of data ?? []) {
    const row = rawRow as Record<string, any>;
    const ownerId = row[ownerColumn];
    const entityRow = Array.isArray(row.research_entities) ? row.research_entities[0] : row.research_entities;
    if (!ownerId || !entityRow) continue;
    links.set(ownerId, [
      ...links.get(ownerId) ?? [],
      {
        id: entityRow.id,
        type: entityRow.type,
        role: row.role,
        key: entityRow.key,
        name: entityRow.name,
        aliases: entityRow.aliases ?? [],
        externalIds: entityRow.external_ids ?? {}
      }
    ]);
  }
  return new Map([...links.entries()].map(([id, values]) => [id, normalizeLinkedEntities(values)]));
}

async function syncEntityLinks(
  client: SupabaseClient,
  orgId: string,
  owner: LinkOwner,
  ownerId: string,
  linkedEntities: LinkedEntity[] = []
): Promise<void> {
  const table = owner === 'note' ? 'note_entity_links' : 'claim_entity_links';
  const ownerColumn = owner === 'note' ? 'note_id' : 'claim_id';
  const entities = normalizeLinkedEntities(linkedEntities);

  const deleteResult = await client.from(table).delete().eq('org_id', orgId).eq(ownerColumn, ownerId);
  if (deleteResult.error) throw deleteResult.error;
  if (!entities.length) return;

  const entityRowsByKey = new Map<string, Record<string, any>>();
  for (const entity of entities) {
    entityRowsByKey.set(`${entity.type}:${entity.key}`, {
      org_id: orgId,
      type: entity.type,
      key: entity.key,
      name: entity.name,
      aliases: entity.aliases ?? [],
      external_ids: entity.externalIds ?? {}
    });
  }

  const upsertResult = await client
    .from('research_entities')
    .upsert([...entityRowsByKey.values()], { onConflict: 'org_id,type,key' });
  if (upsertResult.error) throw upsertResult.error;

  const keys = [...new Set(entities.map(entity => entity.key))];
  const entityResult = await client
    .from('research_entities')
    .select('id,type,key')
    .eq('org_id', orgId)
    .in('key', keys);
  if (entityResult.error) throw entityResult.error;

  const idsByKey = new Map((entityResult.data ?? []).map(row => [`${row.type}:${row.key}`, row.id]));
  const linkRows = entities.flatMap(entity => {
    const entityId = idsByKey.get(`${entity.type}:${entity.key}`);
    if (!entityId) return [];
    return [{
      org_id: orgId,
      [ownerColumn]: ownerId,
      entity_id: entityId,
      role: entity.role
    }];
  });

  if (!linkRows.length) return;
  const insertResult = await client.from(table).insert(linkRows);
  if (insertResult.error) throw insertResult.error;
}

function withDerivedMetadata<T extends Record<string, any>>(value: T, linkedEntities: LinkedEntity[] = []): T & {
  linkedEntities: LinkedEntity[];
  tickers: string[];
  manualThemes: string[];
  kpis: string[];
  industries: string[];
  companyTags: string[];
  watchlistTags: string[];
  sourcePeople: string[];
} {
  const merged = mergeLinkedEntities(linkedEntities, value.linkedEntities, legacyArraysToLinkedEntities({
    tickers: value.tickers ?? [],
    manualThemes: value.manualThemes ?? value.themes ?? [],
    kpis: value.kpis ?? [],
    industries: value.industries ?? [],
    companyTags: value.companyTags ?? [],
    watchlistTags: value.watchlistTags ?? [],
    sourcePeople: value.sourcePeople ?? []
  }));
  const arrays = metadataArraysFromLinkedEntities(merged);
  return {
    ...value,
    linkedEntities: merged,
    ...arrays,
    tickers: Object.prototype.hasOwnProperty.call(value, 'tickers') ? normalizeStringArray(value.tickers ?? []) : arrays.tickers,
    manualThemes: Object.prototype.hasOwnProperty.call(value, 'manualThemes') ? normalizeStringArray(value.manualThemes ?? []) : arrays.manualThemes,
    kpis: Object.prototype.hasOwnProperty.call(value, 'kpis') ? normalizeStringArray(value.kpis ?? []) : arrays.kpis,
    industries: Object.prototype.hasOwnProperty.call(value, 'industries') ? normalizeStringArray(value.industries ?? []) : arrays.industries,
    companyTags: Object.prototype.hasOwnProperty.call(value, 'companyTags') ? normalizeStringArray(value.companyTags ?? []) : arrays.companyTags,
    watchlistTags: Object.prototype.hasOwnProperty.call(value, 'watchlistTags') ? normalizeStringArray(value.watchlistTags ?? []) : arrays.watchlistTags,
    sourcePeople: Object.prototype.hasOwnProperty.call(value, 'sourcePeople') ? normalizeStringArray(value.sourcePeople ?? []) : arrays.sourcePeople
  };
}

function linkedEntitiesFromJson(value: unknown): LinkedEntity[] {
  return Array.isArray(value) ? normalizeLinkedEntities(value as LinkedEntity[]) : [];
}

function normalizeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function mapNoteFromRow(row: Record<string, any>, linkedEntities: LinkedEntity[] = []): WorkspaceNote {
  return withDerivedMetadata({
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
  }, linkedEntities);
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

function mapNoteRevisionFromRow(row: Record<string, any>): NoteRevision {
  const metadata = withDerivedMetadata({
    tickers: row.previous_tickers ?? [],
    manualThemes: row.previous_manual_themes ?? [],
    kpis: row.previous_kpis ?? []
  }, linkedEntitiesFromJson(row.previous_linked_entities));
  return {
    id: row.id,
    orgId: row.org_id,
    noteId: row.note_id,
    editorId: row.editor_id,
    editorName: row.editor_name,
    previousTitle: row.previous_title,
    previousBody: row.previous_body,
    previousVisibility: row.previous_visibility,
    previousSourceType: row.previous_source_type,
    previousObservedAt: row.previous_observed_at,
    previousTickers: row.previous_tickers ?? [],
    previousManualThemes: row.previous_manual_themes ?? [],
    previousKpis: row.previous_kpis ?? [],
    previousLinkedEntities: metadata.linkedEntities,
    previousIndustries: metadata.industries,
    previousCompanyTags: metadata.companyTags,
    previousWatchlistTags: metadata.watchlistTags,
    previousSourcePeople: metadata.sourcePeople,
    changedFields: row.changed_fields ?? [],
    createdAt: row.created_at
  };
}

function mapNoteRevisionToRow(revision: NoteRevision) {
  return {
    id: revision.id.startsWith('revision-') ? undefined : revision.id,
    org_id: revision.orgId,
    note_id: revision.noteId,
    editor_id: revision.editorId,
    editor_name: revision.editorName,
    previous_title: revision.previousTitle,
    previous_body: revision.previousBody,
    previous_visibility: revision.previousVisibility,
    previous_source_type: revision.previousSourceType,
    previous_observed_at: revision.previousObservedAt,
    previous_tickers: revision.previousTickers,
    previous_manual_themes: revision.previousManualThemes,
    previous_kpis: revision.previousKpis,
    previous_linked_entities: revision.previousLinkedEntities ?? [],
    changed_fields: revision.changedFields,
    created_at: revision.createdAt
  };
}

function mapNoteDraftFromRow(row: Record<string, any>): NoteDraft {
  return withDerivedMetadata({
    orgId: row.org_id,
    userId: row.user_id,
    selectedNoteId: row.selected_note_id,
    title: row.title,
    body: row.body,
    visibility: row.visibility,
    observedAt: row.observed_at,
    tickers: row.tickers ?? [],
    manualThemes: row.manual_themes ?? [],
    kpis: row.kpis ?? [],
    updatedAt: row.updated_at
  }, linkedEntitiesFromJson(row.linked_entities));
}

function mapNoteDraftToRow(draft: NoteDraft) {
  return {
    org_id: draft.orgId,
    user_id: draft.userId,
    selected_note_id: draft.selectedNoteId,
    title: draft.title,
    body: draft.body,
    visibility: draft.visibility,
    observed_at: draft.observedAt,
    tickers: draft.tickers,
    manual_themes: draft.manualThemes,
    kpis: draft.kpis,
    linked_entities: draft.linkedEntities ?? [],
    updated_at: draft.updatedAt
  };
}

function mapClaimFromRow(row: Record<string, any>, linkedEntities: LinkedEntity[] = []): WorkspaceClaim {
  return withDerivedMetadata({
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
  }, linkedEntities);
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
