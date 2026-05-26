alter table public.claims
  add column if not exists transcript_citations jsonb not null default '[]'::jsonb;

create table if not exists public.external_evidence_items (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,
  visibility text not null check (visibility in ('public', 'team', 'private')),
  access_scope text not null check (access_scope in ('organization', 'team', 'personal')),
  source_kind text not null check (source_kind in ('news', 'filing', 'press_release', 'transcript', 'other')),
  title text not null,
  summary text not null,
  source_url text,
  source_id text,
  provider text,
  published_at date not null,
  observed_at date not null,
  linked_entities jsonb not null default '[]'::jsonb,
  license_metadata jsonb not null default '{}'::jsonb,
  raw_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (raw_body is null),
  check (
    (access_scope = 'team' and team_id is not null)
    or (access_scope in ('organization', 'personal') and team_id is null)
  )
);

create table if not exists public.external_events (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  evidence_item_id text not null references public.external_evidence_items(id) on delete cascade,
  subject text not null,
  event_text text not null,
  direction text not null check (direction in ('positive', 'negative', 'neutral')),
  evidence text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  observed_at date not null,
  linked_entities jsonb not null default '[]'::jsonb
);

create index if not exists external_evidence_items_org_published_idx
  on public.external_evidence_items (org_id, published_at desc);
create index if not exists external_evidence_items_source_idx
  on public.external_evidence_items (org_id, source_kind, source_id);
create index if not exists external_events_item_idx
  on public.external_events (org_id, evidence_item_id);

alter table public.external_evidence_items enable row level security;
alter table public.external_events enable row level security;

create policy external_evidence_items_select_accessible on public.external_evidence_items
  for select using (
    app.can_access_note(external_evidence_items.org_id, external_evidence_items.access_scope, external_evidence_items.team_id, external_evidence_items.author_id)
  );

create policy external_evidence_items_insert_member on public.external_evidence_items
  for insert with check (
    author_id = auth.uid()
    and app.is_active_org_member(org_id)
    and app.can_access_note(external_evidence_items.org_id, external_evidence_items.access_scope, external_evidence_items.team_id, external_evidence_items.author_id)
    and raw_body is null
  );

create policy external_evidence_items_update_author on public.external_evidence_items
  for update using (
    author_id = auth.uid()
    and app.can_access_note(external_evidence_items.org_id, external_evidence_items.access_scope, external_evidence_items.team_id, external_evidence_items.author_id)
  )
  with check (
    author_id = auth.uid()
    and app.is_active_org_member(org_id)
    and app.can_access_note(external_evidence_items.org_id, external_evidence_items.access_scope, external_evidence_items.team_id, external_evidence_items.author_id)
    and raw_body is null
  );

create policy external_events_select_accessible on public.external_events
  for select using (
    exists (
      select 1
      from public.external_evidence_items i
      where i.id = external_events.evidence_item_id
        and app.can_access_note(i.org_id, i.access_scope, i.team_id, i.author_id)
    )
  );

create policy external_events_insert_author on public.external_events
  for insert with check (
    exists (
      select 1
      from public.external_evidence_items i
      where i.id = external_events.evidence_item_id
        and i.author_id = auth.uid()
        and i.org_id = external_events.org_id
    )
  );

create policy external_events_update_author on public.external_events
  for update using (
    exists (
      select 1
      from public.external_evidence_items i
      where i.id = external_events.evidence_item_id
        and i.author_id = auth.uid()
        and i.org_id = external_events.org_id
    )
  )
  with check (
    exists (
      select 1
      from public.external_evidence_items i
      where i.id = external_events.evidence_item_id
        and i.author_id = auth.uid()
        and i.org_id = external_events.org_id
    )
  );
