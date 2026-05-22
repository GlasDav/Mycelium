create table if not exists public.audio_import_jobs (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,
  visibility text not null check (visibility in ('public', 'team', 'private')),
  access_scope text not null check (access_scope in ('organization', 'team', 'personal')),
  provider text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed', 'applied')),
  file_name text not null,
  content_type text not null,
  selected_note_id text references public.notes(id) on delete set null,
  language text,
  duration_seconds numeric,
  transcript_text text,
  error text,
  note_id text references public.notes(id) on delete set null,
  raw_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (raw_storage_path is null),
  check (
    (access_scope = 'team' and team_id is not null)
    or (access_scope in ('organization', 'personal') and team_id is null)
  ),
  check (
    (status = 'failed' and error is not null)
    or status in ('processing', 'ready', 'applied')
  ),
  check (
    (status = 'applied' and note_id is not null)
    or status in ('processing', 'ready', 'failed')
  )
);

create table if not exists public.transcript_chunks (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  import_job_id text not null references public.audio_import_jobs(id) on delete cascade,
  note_id text references public.notes(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  start_ms integer check (start_ms is null or start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms >= 0),
  speaker text,
  chunk_text text not null,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now(),
  unique (import_job_id, chunk_index),
  check (end_ms is null or start_ms is null or end_ms >= start_ms)
);

alter table public.note_drafts
  add column if not exists audio_import_job_id text references public.audio_import_jobs(id) on delete set null;

create index if not exists audio_import_jobs_org_author_status_idx
  on public.audio_import_jobs (org_id, author_id, status);
create index if not exists audio_import_jobs_note_id_idx
  on public.audio_import_jobs (note_id);
create index if not exists audio_import_jobs_org_note_status_idx
  on public.audio_import_jobs (org_id, note_id, status);
create index if not exists transcript_chunks_note_id_idx
  on public.transcript_chunks (note_id, chunk_index);
create index if not exists transcript_chunks_import_job_id_idx
  on public.transcript_chunks (import_job_id, chunk_index);

alter table public.audio_import_jobs enable row level security;
alter table public.transcript_chunks enable row level security;

create policy audio_import_jobs_select_self_or_note on public.audio_import_jobs
  for select using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.notes n
      where n.id = audio_import_jobs.note_id
        and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
    )
  );

create policy audio_import_jobs_insert_self on public.audio_import_jobs
  for insert with check (
    author_id = auth.uid()
    and app.is_active_org_member(org_id)
    and note_id is null
    and raw_storage_path is null
  );

create policy audio_import_jobs_update_self on public.audio_import_jobs
  for update using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.notes n
      where n.id = audio_import_jobs.note_id
        and n.author_id = auth.uid()
        and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
    )
  )
  with check (
    raw_storage_path is null
    and (
      author_id = auth.uid()
      or exists (
        select 1
        from public.notes n
        where n.id = audio_import_jobs.note_id
          and n.author_id = auth.uid()
          and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
      )
    )
  );

create policy transcript_chunks_select_self_or_note on public.transcript_chunks
  for select using (
    exists (
      select 1
      from public.audio_import_jobs j
      where j.id = transcript_chunks.import_job_id
        and j.author_id = auth.uid()
        and transcript_chunks.note_id is null
    )
    or exists (
      select 1
      from public.notes n
      where n.id = transcript_chunks.note_id
        and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
    )
  );

create policy transcript_chunks_insert_self on public.transcript_chunks
  for insert with check (
    transcript_chunks.note_id is null
    and
    exists (
      select 1
      from public.audio_import_jobs j
      where j.id = transcript_chunks.import_job_id
        and j.author_id = auth.uid()
        and j.org_id = transcript_chunks.org_id
    )
  );

create policy transcript_chunks_update_self_or_note_author on public.transcript_chunks
  for update using (
    exists (
      select 1
      from public.audio_import_jobs j
      where j.id = transcript_chunks.import_job_id
        and j.author_id = auth.uid()
        and transcript_chunks.note_id is null
    )
    or exists (
      select 1
      from public.notes n
      where n.id = transcript_chunks.note_id
        and n.author_id = auth.uid()
        and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
    )
  )
  with check (
    exists (
      select 1
      from public.audio_import_jobs j
      where j.id = transcript_chunks.import_job_id
        and j.author_id = auth.uid()
        and transcript_chunks.note_id is null
    )
    or exists (
      select 1
      from public.notes n
      where n.id = transcript_chunks.note_id
        and n.author_id = auth.uid()
        and app.can_access_note(n.org_id, n.access_scope, n.team_id, n.author_id)
    )
  );

create policy transcript_chunks_delete_self on public.transcript_chunks
  for delete using (
    exists (
      select 1
      from public.audio_import_jobs j
      where j.id = transcript_chunks.import_job_id
        and j.author_id = auth.uid()
        and transcript_chunks.note_id is null
    )
  );
