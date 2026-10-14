-- ============================================================
-- SchoolLink — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- SCHOOLS (table only, RLS policy added after profiles)
-- ============================================================
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,
  address    text,
  created_at timestamptz default now()
);
alter table public.schools enable row level security;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('platform_admin','headteacher','teacher','parent')),
  school_id  uuid references public.schools(id),
  phone      text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "profiles: own read"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- SCHOOLS RLS (now profiles exists)
-- ============================================================
create policy "schools: members read own"
  on public.schools for select
  using (id in (select school_id from public.profiles where id = auth.uid()));

create policy "schools: platform_admin manage"
  on public.schools for all
  using (auth.uid() in (
    select id from public.profiles where role = 'platform_admin'
  ));

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================
create table public.academic_years (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name       text not null,
  start_date date not null,
  end_date   date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);
alter table public.academic_years enable row level security;

create policy "academic_years: school members read"
  on public.academic_years for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "academic_years: headteacher manage"
  on public.academic_years for all
  using (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role in ('headteacher','platform_admin')
  ));

-- ============================================================
-- TERMS
-- ============================================================
create table public.terms (
  id               uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  is_current       boolean default false
);
alter table public.terms enable row level security;

create policy "terms: school members read"
  on public.terms for select
  using (academic_year_id in (
    select id from public.academic_years
    where school_id in (select school_id from public.profiles where id = auth.uid())
  ));

create policy "terms: headteacher manage"
  on public.terms for all
  using (academic_year_id in (
    select id from public.academic_years
    where school_id in (
      select school_id from public.profiles
      where id = auth.uid() and role in ('headteacher','platform_admin')
    )
  ));

-- ============================================================
-- CLASSES
-- ============================================================
create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name             text not null,
  teacher_id       uuid references public.profiles(id)
);
alter table public.classes enable row level security;

create policy "classes: school members read"
  on public.classes for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "classes: headteacher manage"
  on public.classes for all
  using (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role in ('headteacher','platform_admin')
  ));

-- ============================================================
-- SUBJECTS
-- ============================================================
create table public.subjects (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name      text not null,
  code      text
);
alter table public.subjects enable row level security;

create policy "subjects: school members read"
  on public.subjects for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "subjects: headteacher manage"
  on public.subjects for all
  using (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role in ('headteacher','platform_admin')
  ));

-- ============================================================
-- CLASS SUBJECTS (teacher assigned to teach a subject in a class)
-- ============================================================
create table public.class_subjects (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  unique (class_id, subject_id)
);
alter table public.class_subjects enable row level security;

create policy "class_subjects: school members read"
  on public.class_subjects for select
  using (class_id in (
    select id from public.classes
    where school_id in (select school_id from public.profiles where id = auth.uid())
  ));

create policy "class_subjects: headteacher manage"
  on public.class_subjects for all
  using (class_id in (
    select id from public.classes
    where school_id in (
      select school_id from public.profiles
      where id = auth.uid() and role in ('headteacher','platform_admin')
    )
  ));

-- ============================================================
-- STUDENTS
-- ============================================================
create table public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  class_id      uuid not null references public.classes(id),
  full_name     text not null,
  date_of_birth date,
  status        text not null default 'active' check (status in ('active','transferred','graduated')),
  photo_url      text,
  guardian_name  text,
  guardian_phone text,
  created_at     timestamptz default now()
);
alter table public.students enable row level security;

create policy "students: school staff read"
  on public.students for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "students: headteacher manage"
  on public.students for all
  using (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role in ('headteacher','platform_admin')
  ));

-- ============================================================
-- PARENT–STUDENT LINKS
-- ============================================================
create table public.parent_students (
  parent_id  uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (parent_id, student_id)
);
alter table public.parent_students enable row level security;

create policy "parent_students: own read"
  on public.parent_students for select using (parent_id = auth.uid());

create policy "parent_students: headteacher manage"
  on public.parent_students for all
  using (auth.uid() in (
    select id from public.profiles where role in ('headteacher','platform_admin')
  ));

-- Now parent_students exists, safe to add this policy
create policy "students: parent read own children"
  on public.students for select
  using (id in (
    select student_id from public.parent_students where parent_id = auth.uid()
  ));

-- ============================================================
-- ASSESSMENTS
-- ============================================================
create table public.assessments (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  term_id    uuid not null references public.terms(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  title      text not null,
  type       text not null check (type in ('quiz','assignment','test','exam','project','practical')),
  max_score  numeric not null,
  date       date not null,
  created_at timestamptz default now()
);
alter table public.assessments enable row level security;

create policy "assessments: school members read"
  on public.assessments for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "assessments: teacher manage own"
  on public.assessments for all using (teacher_id = auth.uid());

-- ============================================================
-- AUDIT LOGS (created before marks so trigger can reference it)
-- ============================================================
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  uuid,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.audit_logs enable row level security;

create policy "audit_logs: headteacher read"
  on public.audit_logs for select
  using (auth.uid() in (
    select id from public.profiles where role in ('headteacher','platform_admin')
  ));

-- ============================================================
-- MARKS
-- ============================================================
create table public.marks (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  score         numeric not null,
  comment       text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (assessment_id, student_id)
);
alter table public.marks enable row level security;

create policy "marks: teacher manage own assessments"
  on public.marks for all
  using (assessment_id in (
    select id from public.assessments where teacher_id = auth.uid()
  ));

create policy "marks: headteacher read all"
  on public.marks for select
  using (assessment_id in (
    select id from public.assessments
    where school_id in (
      select school_id from public.profiles where id = auth.uid() and role = 'headteacher'
    )
  ));

create policy "marks: parent read own children"
  on public.marks for select
  using (student_id in (
    select student_id from public.parent_students where parent_id = auth.uid()
  ));

-- Audit trigger function
create or replace function public.marks_audit()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
  values (
    'marks',
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op = 'DELETE' then row_to_json(old)::jsonb else null end,
    case when tg_op != 'DELETE' then row_to_json(new)::jsonb else null end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create trigger marks_audit_trigger
  after insert or update or delete on public.marks
  for each row execute function public.marks_audit();

-- ============================================================
-- ATTENDANCE
-- ============================================================
create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  date       date not null,
  status     text not null check (status in ('present','absent','late','excused')),
  note       text,
  created_at timestamptz default now(),
  unique (student_id, date)
);
alter table public.attendance enable row level security;

create policy "attendance: teacher manage own"
  on public.attendance for all using (teacher_id = auth.uid());

create policy "attendance: headteacher read all"
  on public.attendance for select
  using (school_id in (
    select school_id from public.profiles where id = auth.uid() and role = 'headteacher'
  ));

create policy "attendance: parent read own children"
  on public.attendance for select
  using (student_id in (
    select student_id from public.parent_students where parent_id = auth.uid()
  ));

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  title      text not null,
  body       text not null,
  audience   text not null check (audience in ('all','teachers','parents','class')),
  class_id   uuid references public.classes(id),
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;

create policy "announcements: school members read"
  on public.announcements for select
  using (school_id in (select school_id from public.profiles where id = auth.uid()));

create policy "announcements: headteacher/teacher create"
  on public.announcements for insert
  with check (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role in ('headteacher','teacher')
  ));

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  body         text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);
alter table public.messages enable row level security;

create policy "messages: sender or recipient read"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "messages: authenticated send"
  on public.messages for insert with check (sender_id = auth.uid());

create policy "messages: recipient mark read"
  on public.messages for update using (recipient_id = auth.uid());

-- ============================================================
-- INTERVENTIONS
-- ============================================================
create table public.interventions (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  teacher_id   uuid not null references public.profiles(id),
  problem      text not null,
  action       text not null,
  responsible  text not null,
  review_date  date,
  status       text not null default 'open' check (status in ('open','in_progress','resolved')),
  score_before numeric,
  score_after  numeric,
  created_at   timestamptz default now()
);
alter table public.interventions enable row level security;

create policy "interventions: teacher manage own"
  on public.interventions for all using (teacher_id = auth.uid());

create policy "interventions: headteacher read all"
  on public.interventions for select
  using (school_id in (
    select school_id from public.profiles where id = auth.uid() and role = 'headteacher'
  ));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
