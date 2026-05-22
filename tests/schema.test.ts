import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '202605060001_production_foundation.sql');
const migrationFiles = [
  '202605060001_production_foundation.sql',
  '202605090001_note_persistence_spine.sql',
  '202605090002_normalized_research_entities.sql',
  '202605100001_organization_admin_structure.sql',
  '202605220001_audio_transcription_imports.sql'
];
const migrationsSql = migrationFiles
  .map(file => readFileSync(join(process.cwd(), 'supabase', 'migrations', file), 'utf8'))
  .join('\n');

test('production foundation migration defines tenant tables and RLS policies', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  for (const table of [
    'organizations',
    'profiles',
    'teams',
    'team_memberships',
    'notes',
    'claims',
    'relations',
    'audit_events',
    'extraction_jobs'
  ]) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`, 'i'), `${table} table is missing`);
  }

  for (const table of ['organizations', 'profiles', 'teams', 'team_memberships', 'notes', 'claims', 'relations', 'audit_events', 'extraction_jobs']) {
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'), `${table} RLS is missing`);
  }

  assert.match(sql, /create or replace function app\.can_access_note/i);
  assert.match(sql, /create policy notes_select/i);
  assert.match(sql, /create policy claims_select/i);
  assert.match(sql, /create policy relations_select/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /team_memberships/i);
  assert.match(sql, /tickers\s+text\[\]\s+not null\s+default\s+'\{\}'/i);
  assert.match(sql, /manual_themes\s+text\[\]\s+not null\s+default\s+'\{\}'/i);
  assert.match(sql, /kpis\s+text\[\]\s+not null\s+default\s+'\{\}'/i);
});

test('auth bootstrap trigger avoids column-name variables that break signup', () => {
  const sql = readFileSync(migrationPath, 'utf8');
  const handleNewUser = sql.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$;/i)?.[0] ?? '';

  assert(handleNewUser, 'handle_new_user trigger function is missing');
  assert.doesNotMatch(handleNewUser, /\n\s+org_id\s+uuid;/i);
  assert.doesNotMatch(handleNewUser, /\n\s+team_id\s+uuid;/i);
});

test('production persistence migration adds drafts, revisions, and author-only note updates', () => {
  const sql = migrationsSql;

  for (const table of ['note_drafts', 'note_revisions']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`, 'i'), `${table} table is missing`);
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'), `${table} RLS is missing`);
  }

  assert.match(sql, /create policy note_drafts_select_self/i);
  assert.match(sql, /create policy note_drafts_insert_self/i);
  assert.match(sql, /create policy note_drafts_update_self/i);
  assert.match(sql, /create policy note_drafts_delete_self/i);
  assert.match(sql, /create policy note_revisions_select_accessible/i);
  assert.match(sql, /app\.can_access_note\(n\.org_id,\s*note_revisions\.previous_visibility,\s*n\.team_id,\s*n\.author_id\)/i);
  assert.match(sql, /drop policy if exists notes_update on public\.notes/i);
  assert.match(sql, /create policy notes_update on public\.notes[\s\S]*author_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /previous_body\s+text\s+not null/i);
  assert.match(sql, /changed_fields\s+text\[\]\s+not null/i);
});

test('normalized research entity migration adds entity and link tables with access policies', () => {
  const sql = migrationsSql;

  for (const table of ['research_entities', 'note_entity_links', 'claim_entity_links']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`, 'i'), `${table} table is missing`);
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'), `${table} RLS is missing`);
  }

  assert.match(sql, /type\s+text\s+not null\s+check\s*\(\s*type\s+in\s*\('company',\s*'security',\s*'industry',\s*'theme',\s*'kpi',\s*'watchlist',\s*'source_person'\)\s*\)/i);
  assert.match(sql, /unique\s*\(\s*org_id,\s*type,\s*key\s*\)/i);
  assert.match(sql, /create policy research_entities_select/i);
  assert.match(sql, /create policy note_entity_links_select/i);
  assert.match(sql, /create policy claim_entity_links_select/i);
  assert.match(sql, /app\.can_access_note\(n\.org_id,\s*n\.visibility,\s*n\.team_id,\s*n\.author_id\)/i);
  assert.match(sql, /app\.can_access_note\(c\.org_id,\s*c\.visibility,\s*c\.team_id,\s*c\.author_id\)/i);
});

test('organization admin migration adds access scopes, lifecycle state, and invitation tables', () => {
  const sql = migrationsSql;

  assert.match(sql, /alter table public\.profiles[\s\S]*add column if not exists org_role/i);
  assert.match(sql, /org_role[\s\S]*check\s*\(\s*org_role\s+in\s*\('admin',\s*'member'\)\s*\)/i);
  assert.match(sql, /alter table public\.profiles[\s\S]*add column if not exists status/i);
  assert.match(sql, /status[\s\S]*check\s*\(\s*status\s+in\s*\('active',\s*'deactivated'\)\s*\)/i);
  assert.match(sql, /alter table public\.teams[\s\S]*add column if not exists status/i);
  assert.match(sql, /create table if not exists public\.organization_invites/i);
  assert.match(sql, /status\s+text\s+not null\s+default 'pending'[\s\S]*check\s*\(\s*status\s+in\s*\('pending',\s*'accepted',\s*'cancelled'\)\s*\)/i);
  assert.match(sql, /team_ids\s+uuid\[\]\s+not null\s+default '\{\}'/i);
  assert.match(sql, /alter table public\.notes[\s\S]*add column if not exists access_scope/i);
  assert.match(sql, /alter table public\.claims[\s\S]*add column if not exists access_scope/i);
  assert.match(sql, /alter table public\.notes[\s\S]*alter column team_id drop not null/i);
  assert.match(sql, /alter table public\.claims[\s\S]*alter column team_id drop not null/i);
  assert.match(sql, /create or replace function app\.is_org_admin/i);
  assert.match(sql, /create or replace function app\.is_active_org_member/i);
  assert.match(sql, /create or replace function app\.can_access_note\(\s*target_org uuid,\s*target_access_scope text,\s*target_team uuid,\s*target_author uuid/i);
  assert.match(sql, /target_access_scope = 'personal'[\s\S]*target_author = auth\.uid\(\)/i);
  assert.match(sql, /target_access_scope = 'team'[\s\S]*team_memberships/i);
  assert.match(sql, /target_access_scope = 'organization'/i);
  assert.match(sql, /create policy organization_invites_select_admin/i);
  assert.match(sql, /public\.handle_new_user\(\)[\s\S]*organization_invites/i);
  assert.match(sql, /No pending invitation/i);
});

test('audio transcription import migration adds transcript job and chunk persistence contracts', () => {
  const sql = migrationsSql;

  for (const table of ['audio_import_jobs', 'transcript_chunks']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`, 'i'), `${table} table is missing`);
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'), `${table} RLS is missing`);
  }

  assert.match(sql, /status\s+text\s+not null\s+default 'processing'[\s\S]*check\s*\(\s*status\s+in\s*\('processing',\s*'ready',\s*'failed',\s*'applied'\)\s*\)/i);
  assert.match(sql, /access_scope\s+text\s+not null[\s\S]*check\s*\(\s*access_scope\s+in\s*\('organization',\s*'team',\s*'personal'\)\s*\)/i);
  assert.match(sql, /raw_storage_path/i, 'migration should explicitly block durable raw audio paths');
  assert.match(sql, /selected_note_id\s+text\s+references public\.notes\(id\)/i);
  assert.match(sql, /language\s+text/i);
  assert.match(sql, /confidence\s+numeric\s+check\s*\(\s*confidence\s+is\s+null\s+or\s+\(confidence\s+>=\s+0\s+and\s+confidence\s+<=\s+1\)\s*\)/i);
  assert.match(sql, /alter table public\.note_drafts[\s\S]*audio_import_job_id\s+text\s+references public\.audio_import_jobs\(id\)/i);
  assert.match(sql, /check\s*\(\s*raw_storage_path\s+is\s+null\s*\)/i);
  assert.match(sql, /create policy audio_import_jobs_select_self_or_note/i);
  assert.match(sql, /create policy transcript_chunks_select_self_or_note/i);
  assert.match(sql, /author_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /transcript_chunks\.note_id\s+is\s+null/i);
  assert.match(sql, /app\.can_access_note\(n\.org_id,\s*n\.access_scope,\s*n\.team_id,\s*n\.author_id\)/i);
  assert.match(sql, /create index(?: if not exists)? audio_import_jobs_org_author_status_idx/i);
  assert.match(sql, /create index(?: if not exists)? audio_import_jobs_note_id_idx/i);
  assert.match(sql, /create index(?: if not exists)? transcript_chunks_note_id_idx/i);
  assert.match(sql, /unique\s*\(\s*import_job_id,\s*chunk_index\s*\)/i);
});
