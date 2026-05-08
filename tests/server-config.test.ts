import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readSupabaseServerConfig } from '../server/supabase-repository';

test('server config loads Supabase keys from the documented env file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mycelium-env-'));
  const envPath = join(dir, '.env');
  writeFileSync(envPath, [
    'SUPABASE_URL=http://127.0.0.1:55321',
    'SUPABASE_ANON_KEY=anon-from-file',
    'SUPABASE_SERVICE_ROLE_KEY=service-from-file',
    'PORT=5174'
  ].join('\n'));

  try {
    const config = readSupabaseServerConfig({}, envPath);
    assert.deepEqual(config, {
      supabaseUrl: 'http://127.0.0.1:55321',
      supabaseAnonKey: 'anon-from-file',
      supabaseServiceRoleKey: 'service-from-file'
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
