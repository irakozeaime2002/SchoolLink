-- Supervisors table: external visitors given temporary read-only access
create table if not exists supervisors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  institution text not null,
  access_code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table supervisors enable row level security;

-- Allow anon role to select (needed for code-based login without auth)
grant select on supervisors to anon;

-- Headteacher of the school can manage supervisors
create policy "headteacher_manage_supervisors" on supervisors
  for all using (
    school_id in (
      select school_id from profiles where id = auth.uid() and role = 'headteacher'
    )
  );

-- Public read by code (used for code-based login — no auth.uid())
create policy "public_read_by_code" on supervisors
  for select using (true);
