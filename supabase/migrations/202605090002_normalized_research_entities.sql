create table if not exists public.research_entities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('company', 'security', 'industry', 'theme', 'kpi', 'watchlist', 'source_person')),
  key text not null,
  name text not null,
  aliases text[] not null default '{}',
  external_ids jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, type, key)
);

create table if not exists public.note_entity_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  note_id text not null references public.notes(id) on delete cascade,
  entity_id uuid not null references public.research_entities(id) on delete cascade,
  role text not null check (role in ('company', 'subject', 'security', 'industry', 'theme', 'kpi', 'watchlist', 'source_person')),
  created_at timestamptz not null default now(),
  unique (note_id, entity_id, role)
);

create table if not exists public.claim_entity_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  claim_id text not null references public.claims(id) on delete cascade,
  entity_id uuid not null references public.research_entities(id) on delete cascade,
  role text not null check (role in ('company', 'subject', 'security', 'industry', 'theme', 'kpi', 'watchlist', 'source_person')),
  created_at timestamptz not null default now(),
  unique (claim_id, entity_id, role)
);

alter table public.note_drafts
  add column if not exists linked_entities jsonb not null default '[]'::jsonb;

alter table public.note_revisions
  add column if not exists previous_linked_entities jsonb not null default '[]'::jsonb;

alter table public.research_entities enable row level security;
alter table public.note_entity_links enable row level security;
alter table public.claim_entity_links enable row level security;

create policy research_entities_select on public.research_entities
  for select using (
    app.is_pm_or_compliance(org_id)
    or exists (
      select 1
      from public.note_entity_links nel
      join public.notes n on n.id = nel.note_id
      where nel.entity_id = research_entities.id
        and app.can_access_note(n.org_id, n.visibility, n.team_id, n.author_id)
    )
    or exists (
      select 1
      from public.claim_entity_links cel
      join public.claims c on c.id = cel.claim_id
      where cel.entity_id = research_entities.id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  );

create policy research_entities_insert_member on public.research_entities
  for insert with check (app.is_org_member(org_id));

create policy research_entities_update_member on public.research_entities
  for update using (app.is_org_member(org_id))
  with check (app.is_org_member(org_id));

create policy note_entity_links_select on public.note_entity_links
  for select using (
    exists (
      select 1
      from public.notes n
      where n.id = note_entity_links.note_id
        and app.can_access_note(n.org_id, n.visibility, n.team_id, n.author_id)
    )
  );

create policy note_entity_links_insert_author on public.note_entity_links
  for insert with check (
    exists (
      select 1
      from public.notes n
      where n.id = note_entity_links.note_id
        and n.author_id = auth.uid()
        and app.is_org_member(n.org_id)
    )
  );

create policy note_entity_links_update_author on public.note_entity_links
  for update using (
    exists (
      select 1
      from public.notes n
      where n.id = note_entity_links.note_id
        and n.author_id = auth.uid()
        and app.is_org_member(n.org_id)
    )
  ) with check (
    exists (
      select 1
      from public.notes n
      where n.id = note_entity_links.note_id
        and n.author_id = auth.uid()
        and app.is_org_member(n.org_id)
    )
  );

create policy note_entity_links_delete_author on public.note_entity_links
  for delete using (
    exists (
      select 1
      from public.notes n
      where n.id = note_entity_links.note_id
        and n.author_id = auth.uid()
        and app.is_org_member(n.org_id)
    )
  );

create policy claim_entity_links_select on public.claim_entity_links
  for select using (
    exists (
      select 1
      from public.claims c
      where c.id = claim_entity_links.claim_id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  );

create policy claim_entity_links_insert_accessible on public.claim_entity_links
  for insert with check (
    exists (
      select 1
      from public.claims c
      where c.id = claim_entity_links.claim_id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  );

create policy claim_entity_links_update_accessible on public.claim_entity_links
  for update using (
    exists (
      select 1
      from public.claims c
      where c.id = claim_entity_links.claim_id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  ) with check (
    exists (
      select 1
      from public.claims c
      where c.id = claim_entity_links.claim_id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  );

create policy claim_entity_links_delete_accessible on public.claim_entity_links
  for delete using (
    exists (
      select 1
      from public.claims c
      where c.id = claim_entity_links.claim_id
        and app.can_access_note(c.org_id, c.visibility, c.team_id, c.author_id)
    )
  );

create index if not exists research_entities_org_type_key_idx on public.research_entities(org_id, type, key);
create index if not exists note_entity_links_note_idx on public.note_entity_links(org_id, note_id);
create index if not exists note_entity_links_entity_idx on public.note_entity_links(org_id, entity_id);
create index if not exists claim_entity_links_claim_idx on public.claim_entity_links(org_id, claim_id);
create index if not exists claim_entity_links_entity_idx on public.claim_entity_links(org_id, entity_id);
