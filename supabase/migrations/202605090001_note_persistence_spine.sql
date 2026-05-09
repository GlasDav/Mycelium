drop policy if exists notes_update on public.notes;

create policy notes_update on public.notes
  for update using (
    author_id = auth.uid()
    and app.is_org_member(org_id)
  ) with check (
    author_id = auth.uid()
    and app.is_org_member(org_id)
  );

create table if not exists public.note_drafts (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_note_id text references public.notes(id) on delete set null,
  title text not null default '',
  body text not null default '',
  visibility text not null default 'team' check (visibility in ('public', 'team', 'private')),
  observed_at date,
  tickers text[] not null default '{}',
  manual_themes text[] not null default '{}',
  kpis text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  note_id text not null references public.notes(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  editor_name text not null,
  previous_title text not null,
  previous_body text not null,
  previous_visibility text not null check (previous_visibility in ('public', 'team', 'private')),
  previous_source_type text not null,
  previous_observed_at date,
  previous_tickers text[] not null default '{}',
  previous_manual_themes text[] not null default '{}',
  previous_kpis text[] not null default '{}',
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.note_drafts enable row level security;
alter table public.note_revisions enable row level security;

create policy note_drafts_select_self on public.note_drafts
  for select using (
    user_id = auth.uid()
    and app.is_org_member(org_id)
  );

create policy note_drafts_insert_self on public.note_drafts
  for insert with check (
    user_id = auth.uid()
    and app.is_org_member(org_id)
  );

create policy note_drafts_update_self on public.note_drafts
  for update using (
    user_id = auth.uid()
    and app.is_org_member(org_id)
  ) with check (
    user_id = auth.uid()
    and app.is_org_member(org_id)
  );

create policy note_drafts_delete_self on public.note_drafts
  for delete using (
    user_id = auth.uid()
    and app.is_org_member(org_id)
  );

create policy note_revisions_select_accessible on public.note_revisions
  for select using (
    exists (
      select 1
      from public.notes n
      where n.id = note_revisions.note_id
        and app.can_access_note(n.org_id, note_revisions.previous_visibility, n.team_id, n.author_id)
    )
  );

create policy note_revisions_insert_author on public.note_revisions
  for insert with check (
    editor_id = auth.uid()
    and exists (
      select 1
      from public.notes n
      where n.id = note_revisions.note_id
        and n.author_id = auth.uid()
        and app.is_org_member(n.org_id)
    )
  );

create index if not exists note_drafts_user_idx on public.note_drafts(user_id, updated_at desc);
create index if not exists note_revisions_note_idx on public.note_revisions(org_id, note_id, created_at desc);
