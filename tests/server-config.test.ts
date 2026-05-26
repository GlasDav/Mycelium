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
      supabaseServiceRoleKey: 'service-from-file',
      audioTranscription: undefined
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('server config reads opt-in audio transcription provider settings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mycelium-env-'));
  const envPath = join(dir, '.env');
  writeFileSync(envPath, [
    'SUPABASE_URL=http://127.0.0.1:55321',
    'SUPABASE_ANON_KEY=anon-from-file',
    'SUPABASE_SERVICE_ROLE_KEY=service-from-file',
    'MYCELIUM_AUDIO_TRANSCRIPTION_PROVIDER=http',
    'MYCELIUM_AUDIO_TRANSCRIPTION_PROVIDER_NAME=pilot-transcriber',
    'MYCELIUM_AUDIO_TRANSCRIPTION_ENDPOINT=https://transcription.example.test/v1/jobs',
    'MYCELIUM_AUDIO_TRANSCRIPTION_API_KEY=secret-from-file'
  ].join('\n'));

  try {
    const config = readSupabaseServerConfig({}, envPath);
    assert.deepEqual(config.audioTranscription, {
      provider: 'http',
      providerName: 'pilot-transcriber',
      endpointUrl: 'https://transcription.example.test/v1/jobs',
      apiKey: 'secret-from-file'
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
