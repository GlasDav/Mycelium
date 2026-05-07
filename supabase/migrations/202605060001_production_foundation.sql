create extension if not exists pgcrypto;

create schema if not exists app;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  plan text not null default 'private_alpha',
  data_region text not null default 'local',
  retention_policy text not null default 'default',
  model_processing_policy text not null default 'deterministic_only',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('Analyst', 'PM', 'Compliance', 'Guest')),
  coverage_entities text[] not null default '{}',
  notification_preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sector_focus text,
  default_permissions text not null default 'team',
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.notes (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_name text not null,
  title text not null,
  body text not null,
  visibility text not null check (visibility in ('public', 'team', 'private')),
  source_type text not null,
  created_at date not null,
  updated_at timestamptz not null default now(),
  observed_at date,
  applies_to_start date,
  applies_to_end date,
  horizon text check (horizon in ('point_in_time', 'near_term', 'quarter', 'year', 'unknown')),
  restricted_tags text[] not null default '{}',
  processing_status text not null default 'pending'
);

create table if not exists public.claims (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  note_id text not null references public.notes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_name text not null,
  visibility text not null check (visibility in ('public', 'team', 'private')),
  subject text not null,
  claim_text text not null,
  direction text not null check (direction in ('positive', 'negative', 'neutral')),
  evidence text not null,
  confidence numeric not null,
  themes text[] not null default '{}',
  created_at date not null,
  observed_at date not null,
  applies_to_start date not null,
  applies_to_end date,
  horizon text not null check (horizon in ('point_in_time', 'near_term', 'quarter', 'year', 'unknown')),
  freshness text not null check (freshness in ('fresh', 'aging', 'stale')),
  review_status text not null default 'machine' check (review_status in ('machine', 'analyst_confirmed', 'analyst_rejected', 'edited')),
  review_note text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.relations (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  claim_a_id text not null references public.claims(id) on delete cascade,
  claim_b_id text not null references public.claims(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('contradiction', 'update_or_trend_reversal', 'historical_tension', 'open_tension', 'corroboration', 'agreement', 'stale_evidence')),
  original_type text not null check (original_type in ('contradiction', 'update_or_trend_reversal', 'historical_tension', 'open_tension', 'corroboration', 'agreement', 'stale_evidence')),
  reason text not null,
  score numeric not null,
  overlap_days integer not null,
  review_status text not null default 'open' check (review_status in ('open', 'confirmed', 'dismissed', 'reclassified')),
  review_note text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  note_id text references public.notes(id) on delete cascade,
  provider text not null default 'deterministic',
  status text not null default 'queued',
  output jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app.is_org_member(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.org_id = target_org
  );
$$;

create or replace function app.is_pm_or_compliance(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.org_id = target_org
      and p.role in ('PM', 'Compliance')
  );
$$;

create or replace function app.can_access_note(
  target_org uuid,
  target_visibility text,
  target_team uuid,
  target_author uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select app.is_org_member(target_org)
    and (
      app.is_pm_or_compliance(target_org)
      or target_visibility = 'public'
      or target_author = auth.uid()
      or (
        target_visibility = 'team'
        and exists (
          select 1
          from public.team_memberships tm
          where tm.org_id = target_org
            and tm.team_id = target_team
            and tm.user_id = auth.uid()
        )
      )
    );
$$;

create or replace function app.seed_demo_notes(
  target_org uuid,
  target_author uuid,
  target_team uuid,
  target_team_name text,
  target_author_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.notes where org_id = target_org) then
    return;
  end if;

  insert into public.notes (
    id, org_id, author_id, author_name, team_id, team_name, title, body, visibility,
    source_type, created_at, observed_at, applies_to_start, applies_to_end, horizon, processing_status
  )
  values
    ('seed-n0-' || target_org::text, target_org, target_author, target_author_name, target_team, target_team_name, 'Historical AI server digest - last spring', 'Nvidia H100 demand was weak as cloud buyers paused GPU orders after a digestion cycle. Microsoft Azure capex growth was lower as budget pressure delayed purchases.', 'team', 'Channel check', '2025-05-01', '2025-05-01', '2025-05-01', '2025-07-30', 'near_term', 'pending'),
    ('seed-n1-' || target_org::text, target_org, target_author, target_author_name, target_team, target_team_name, 'AI server channel check - Taipei ODMs', 'Nvidia H100 demand remains strong and Blackwell orders are accelerating into Q3. Azure capex conversations suggest Microsoft demand for AI infrastructure is higher than prior plans. GPU supply is still tight, which supports pricing.', 'team', 'Channel check', '2026-05-01', '2026-05-01', '2026-05-01', '2026-08-01', 'near_term', 'pending'),
    ('seed-n2-' || target_org::text, target_org, target_author, target_author_name, target_team, target_team_name, 'Cloud buyer call: budget digestion', 'Nvidia demand may slow after the current H100 backlog clears because several buyers flagged budget pressure. Microsoft Azure growth is improving, but some Copilot attach-rate evidence remains weak.', 'team', 'Expert call', '2026-05-02', '2026-05-02', '2026-05-02', '2026-08-02', 'near_term', 'pending');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_domain text;
  org_id uuid;
  team_id uuid;
  team_name text;
  display_name text;
  requested_role text;
begin
  user_domain := lower(split_part(new.email, '@', 2));
  team_name := coalesce(new.raw_user_meta_data->>'team_name', 'Research');
  display_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'Analyst');

  if requested_role not in ('Analyst', 'PM', 'Compliance', 'Guest') then
    requested_role := 'Analyst';
  end if;

  insert into public.organizations (name, domain)
  values (coalesce(new.raw_user_meta_data->>'organization_name', user_domain), user_domain)
  on conflict (domain) do update set name = excluded.name
  returning id into org_id;

  insert into public.teams (org_id, name, sector_focus)
  values (org_id, team_name, team_name)
  on conflict (org_id, name) do update set name = excluded.name
  returning id into team_id;

  insert into public.profiles (id, org_id, email, name, role)
  values (new.id, org_id, new.email, display_name, requested_role)
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        updated_at = now();

  insert into public.team_memberships (org_id, team_id, user_id, role)
  values (org_id, team_id, new.id, 'member')
  on conflict (team_id, user_id) do nothing;

  perform app.seed_demo_notes(org_id, new.id, team_id, team_name, display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.notes enable row level security;
alter table public.claims enable row level security;
alter table public.relations enable row level security;
alter table public.audit_events enable row level security;
alter table public.extraction_jobs enable row level security;

create policy organizations_select on public.organizations
  for select using (app.is_org_member(id));

create policy profiles_select on public.profiles
  for select using (app.is_org_member(org_id));

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy teams_select on public.teams
  for select using (app.is_org_member(org_id));

create policy team_memberships_select on public.team_memberships
  for select using (app.is_org_member(org_id));

create policy notes_select on public.notes
  for select using (app.can_access_note(org_id, visibility, team_id, author_id));

create policy notes_insert on public.notes
  for insert with check (author_id = auth.uid() and app.is_org_member(org_id));

create policy notes_update on public.notes
  for update using (app.can_access_note(org_id, visibility, team_id, author_id))
  with check (app.can_access_note(org_id, visibility, team_id, author_id));

create policy claims_select on public.claims
  for select using (app.can_access_note(org_id, visibility, team_id, author_id));

create policy claims_update on public.claims
  for update using (app.can_access_note(org_id, visibility, team_id, author_id))
  with check (app.can_access_note(org_id, visibility, team_id, author_id));

create policy relations_select on public.relations
  for select using (
    exists (
      select 1
      from public.claims ca
      join public.claims cb on cb.id = relations.claim_b_id
      where ca.id = relations.claim_a_id
        and app.can_access_note(ca.org_id, ca.visibility, ca.team_id, ca.author_id)
        and app.can_access_note(cb.org_id, cb.visibility, cb.team_id, cb.author_id)
    )
  );

create policy relations_update on public.relations
  for update using (
    exists (
      select 1
      from public.claims ca
      join public.claims cb on cb.id = relations.claim_b_id
      where ca.id = relations.claim_a_id
        and app.can_access_note(ca.org_id, ca.visibility, ca.team_id, ca.author_id)
        and app.can_access_note(cb.org_id, cb.visibility, cb.team_id, cb.author_id)
    )
  );

create policy audit_events_select on public.audit_events
  for select using (app.is_pm_or_compliance(org_id) or actor_id = auth.uid());

create policy extraction_jobs_select on public.extraction_jobs
  for select using (app.is_org_member(org_id));

create index if not exists profiles_org_id_idx on public.profiles(org_id);
create index if not exists notes_org_id_idx on public.notes(org_id);
create index if not exists notes_access_idx on public.notes(org_id, visibility, team_id, author_id);
create index if not exists claims_org_note_idx on public.claims(org_id, note_id);
create index if not exists claims_access_idx on public.claims(org_id, visibility, team_id, author_id);
create index if not exists relations_org_idx on public.relations(org_id);
create index if not exists audit_events_org_created_idx on public.audit_events(org_id, created_at desc);
