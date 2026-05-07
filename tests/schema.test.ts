import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '202605060001_production_foundation.sql');

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
