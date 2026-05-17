import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseServerConfig, type SupabaseServerConfig } from '../server/supabase-repository';

const healthTimeoutMs = 1500;

test('live Supabase auth bootstrap enforces invite-gated same-domain signup', async t => {
  const config = readLiveConfig();
  if (!config) {
    t.skip('Local Supabase config is not available');
    return;
  }

  if (!(await isSupabaseHealthy(config.supabaseUrl))) {
    t.skip('Local Supabase/Docker is not running');
    return;
  }

  const anonClient = createLiveClient(config.supabaseUrl, config.supabaseAnonKey);
  const serviceClient = createLiveClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const suffix = `${process.pid}-${Date.now()}`;
  const domain = `rls-${suffix}.example.test`;
  const adminEmail = `admin@${domain}`;
  const blockedEmail = `blocked@${domain}`;
  const password = `RlsLive-${suffix}!`;
  const createdUserIds: string[] = [];
  let createdOrgId = '';

  try {
    const signup = await anonClient.auth.signUp({
      email: adminEmail,
      password,
      options: {
        data: {
          name: 'RLS Admin',
          organization_name: 'RLS Live Test',
          team_name: 'Research',
          role: 'PM'
        }
      }
    });

    assert.ifError(signup.error);
    assert(signup.data.user?.id, 'expected first signup to create a local auth user');
    createdUserIds.push(signup.data.user.id);

    const profile = await waitForProfile(serviceClient, signup.data.user.id);
    createdOrgId = profile.org_id;
    assert.equal(profile.email, adminEmail);
    assert.equal(profile.org_role, 'admin');
    assert.equal(profile.status, 'active');

    const { data: organization, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, domain')
      .eq('id', createdOrgId)
      .single();
    assert.ifError(orgError);
    assert.equal(organization.domain, domain);

    const { data: memberships, error: membershipError } = await serviceClient
      .from('team_memberships')
      .select('id')
      .eq('user_id', signup.data.user.id);
    assert.ifError(membershipError);
    assert((memberships ?? []).length > 0, 'expected bootstrap to create a team membership');

    const { data: notes, error: notesError } = await serviceClient
      .from('notes')
      .select('id')
      .eq('org_id', createdOrgId);
    assert.ifError(notesError);
    assert((notes ?? []).length > 0, 'expected first local org bootstrap to seed demo notes');

    const blockedSignup = await anonClient.auth.signUp({
      email: blockedEmail,
      password,
      options: { data: { name: 'Blocked User' } }
    });

    assert(blockedSignup.error, 'expected same-domain signup without invite to fail');
    assert.match(blockedSignup.error.message, /No pending invitation|Database error saving new user/i);
    if (blockedSignup.data.user?.id) createdUserIds.push(blockedSignup.data.user.id);
  } finally {
    for (const userId of createdUserIds) {
      await serviceClient.auth.admin.deleteUser(userId);
    }
    if (createdOrgId) {
      await serviceClient.from('organizations').delete().eq('id', createdOrgId);
    }
  }
});

function readLiveConfig(): SupabaseServerConfig | undefined {
  try {
    return readSupabaseServerConfig();
  } catch {
    return undefined;
  }
}

function createLiveClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function isSupabaseHealthy(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), healthTimeoutMs);
  try {
    const response = await fetch(new URL('/auth/v1/health', url), {
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForProfile(client: SupabaseClient, userId: string): Promise<{
  id: string;
  org_id: string;
  email: string;
  org_role: string;
  status: string;
}> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await client
      .from('profiles')
      .select('id, org_id, email, org_role, status')
      .eq('id', userId)
      .maybeSingle();
    if (error) lastError = error;
    if (data) return data;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for profile ${userId}`);
}
