alter table public.profiles
  add column if not exists org_role text not null default 'member' check (org_role in ('admin', 'member')),
  add column if not exists status text not null default 'active' check (status in ('active', 'deactivated')),
  add column if not exists primary_team_id uuid references public.teams(id) on delete set null;

alter table public.teams
  add column if not exists status text not null default 'active' check (status in ('active', 'archived'));

create table if not exists public.organization_invites (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('Analyst', 'PM', 'Compliance', 'Guest')),
  org_role text not null default 'member' check (org_role in ('admin', 'member')),
  team_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  unique (org_id, email, status)
);

alter table public.notes
  add column if not exists access_scope text not null default 'team' check (access_scope in ('organization', 'team', 'personal'));
update public.notes
set access_scope = case visibility when 'public' then 'organization' when 'private' then 'personal' else 'team' end;
alter table public.notes
  alter column team_id drop not null,
  alter column team_name drop not null;

alter table public.claims
  add column if not exists access_scope text not null default 'team' check (access_scope in ('organization', 'team', 'personal'));
update public.claims
set access_scope = case visibility when 'public' then 'organization' when 'private' then 'personal' else 'team' end;
alter table public.claims
  alter column team_id drop not null,
  alter column team_name drop not null;

alter table public.note_drafts
  add column if not exists access_scope text not null default 'personal' check (access_scope in ('organization', 'team', 'personal')),
  add column if not exists team_id uuid references public.teams(id) on delete set null;
update public.note_drafts
set access_scope = case visibility when 'public' then 'organization' when 'private' then 'personal' else 'team' end;

create or replace function app.is_active_org_member(target_org uuid)
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
      and p.status = 'active'
  );
$$;

create or replace function app.is_org_admin(target_org uuid)
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
      and p.status = 'active'
      and p.org_role = 'admin'
  );
$$;

create or replace function app.is_org_member(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select app.is_active_org_member(target_org);
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
      and p.status = 'active'
      and p.role in ('PM', 'Compliance')
  );
$$;

create or replace function app.can_access_note(
  target_org uuid,
  target_access_scope text,
  target_team uuid,
  target_author uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select app.is_active_org_member(target_org)
    and (
      (target_access_scope = 'personal' and target_author = auth.uid())
      or target_access_scope = 'organization'
      or (
        target_access_scope = 'team'
        and (
          app.is_pm_or_compliance(target_org)
          or exists (
            select 1
            from public.team_memberships tm
            join public.teams t on t.id = tm.team_id
            where tm.org_id = target_org
              and tm.team_id = target_team
              and tm.user_id = auth.uid()
              and t.status = 'active'
          )
        )
      )
    );
$$;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (app.is_active_org_member(id));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (app.is_active_org_member(org_id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() and app.is_active_org_member(org_id))
  with check (id = auth.uid() and app.is_active_org_member(org_id));

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select using (app.is_active_org_member(org_id));

drop policy if exists team_memberships_select on public.team_memberships;
create policy team_memberships_select on public.team_memberships
  for select using (app.is_active_org_member(org_id));

alter table public.organization_invites enable row level security;
create policy organization_invites_select_admin on public.organization_invites
  for select using (app.is_org_admin(org_id));
create policy organization_invites_insert_admin on public.organization_invites
  for insert with check (app.is_org_admin(org_id));
create policy organization_invites_update_admin on public.organization_invites
  for update using (app.is_org_admin(org_id))
  with check (app.is_org_admin(org_id));

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select using (app.can_access_note(org_id, access_scope, team_id, author_id));
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert with check (author_id = auth.uid() and app.can_access_note(org_id, access_scope, team_id, author_id));
drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
  for update using (author_id = auth.uid() and app.can_access_note(org_id, access_scope, team_id, author_id))
  with check (author_id = auth.uid() and app.can_access_note(org_id, access_scope, team_id, author_id));

drop policy if exists claims_select on public.claims;
create policy claims_select on public.claims
  for select using (app.can_access_note(org_id, access_scope, team_id, author_id));
drop policy if exists claims_update on public.claims;
create policy claims_update on public.claims
  for update using (app.can_access_note(org_id, access_scope, team_id, author_id))
  with check (app.can_access_note(org_id, access_scope, team_id, author_id));

drop policy if exists relations_select on public.relations;
create policy relations_select on public.relations
  for select using (
    exists (
      select 1
      from public.claims ca
      join public.claims cb on cb.id = relations.claim_b_id
      where ca.id = relations.claim_a_id
        and app.can_access_note(ca.org_id, ca.access_scope, ca.team_id, ca.author_id)
        and app.can_access_note(cb.org_id, cb.access_scope, cb.team_id, cb.author_id)
    )
  );

drop policy if exists note_drafts_select_self on public.note_drafts;
create policy note_drafts_select_self on public.note_drafts
  for select using (user_id = auth.uid() and app.is_active_org_member(org_id));
drop policy if exists note_drafts_insert_self on public.note_drafts;
create policy note_drafts_insert_self on public.note_drafts
  for insert with check (user_id = auth.uid() and app.is_active_org_member(org_id));
drop policy if exists note_drafts_update_self on public.note_drafts;
create policy note_drafts_update_self on public.note_drafts
  for update using (user_id = auth.uid() and app.is_active_org_member(org_id))
  with check (user_id = auth.uid() and app.is_active_org_member(org_id));
drop policy if exists note_drafts_delete_self on public.note_drafts;
create policy note_drafts_delete_self on public.note_drafts
  for delete using (user_id = auth.uid() and app.is_active_org_member(org_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_domain text;
  target_org_id uuid;
  target_team_id uuid;
  team_name text;
  display_name text;
  requested_role text;
  requested_org_role text;
  pending_invite public.organization_invites%rowtype;
begin
  user_domain := lower(split_part(new.email, '@', 2));
  team_name := coalesce(new.raw_user_meta_data->>'team_name', 'Research');
  display_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'Analyst');

  if requested_role not in ('Analyst', 'PM', 'Compliance', 'Guest') then
    requested_role := 'Analyst';
  end if;

  select *
  into pending_invite
  from public.organization_invites
  where lower(email) = lower(new.email)
    and status = 'pending'
  order by created_at desc
  limit 1;

  if found then
    target_org_id := pending_invite.org_id;
    requested_role := pending_invite.role;
    requested_org_role := pending_invite.org_role;
    target_team_id := pending_invite.team_ids[1];
  else
    if exists (select 1 from public.organizations where domain = user_domain) then
      raise exception 'No pending invitation for %', new.email;
    end if;

    requested_org_role := 'admin';
    insert into public.organizations (name, domain)
    values (coalesce(new.raw_user_meta_data->>'organization_name', user_domain), user_domain)
    returning id into target_org_id;

    insert into public.teams (org_id, name, sector_focus)
    values (target_org_id, team_name, team_name)
    returning id into target_team_id;
  end if;

  insert into public.profiles (id, org_id, email, name, role, org_role, status, primary_team_id)
  values (new.id, target_org_id, new.email, display_name, requested_role, requested_org_role, 'active', target_team_id)
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        org_role = excluded.org_role,
        status = 'active',
        primary_team_id = excluded.primary_team_id,
        updated_at = now();

  if found then
    insert into public.team_memberships (org_id, team_id, user_id, role)
    select target_org_id, unnest(pending_invite.team_ids), new.id, 'member'
    on conflict (team_id, user_id) do nothing;

    update public.organization_invites
    set status = 'accepted',
        accepted_at = now()
    where id = pending_invite.id;
  else
    insert into public.team_memberships (org_id, team_id, user_id, role)
    values (target_org_id, target_team_id, new.id, 'member')
    on conflict (team_id, user_id) do nothing;

    perform app.seed_demo_notes(target_org_id, new.id, target_team_id, team_name, display_name);
  end if;

  return new;
end;
$$;

create index if not exists profiles_org_status_idx on public.profiles(org_id, status, org_role);
create index if not exists teams_org_status_idx on public.teams(org_id, status);
create index if not exists organization_invites_org_status_idx on public.organization_invites(org_id, status, email);
create index if not exists notes_access_scope_idx on public.notes(org_id, access_scope, team_id, author_id);
create index if not exists claims_access_scope_idx on public.claims(org_id, access_scope, team_id, author_id);
