import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '202605060001_production_foundation.sql');
const migrationsSql = readFileSync(join(process.cwd(), 'supabase', 'migrations', '202605060001_production_foundation.sql'), 'utf8')
  + '\n'
  + (readFileSync(join(process.cwd(), 'supabase', 'migrations', '202605090001_note_persistence_spine.sql'), 'utf8'));

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
