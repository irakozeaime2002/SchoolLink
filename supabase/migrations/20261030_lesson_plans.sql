create table public.lesson_plans (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  description  text,
  file_url     text not null,
  file_name    text not null,
  plan_date    date,
  created_at   timestamptz default now()
);
alter table public.lesson_plans enable row level security;

create policy "lesson_plans: teacher manage own"
  on public.lesson_plans for all using (teacher_id = auth.uid());

create policy "lesson_plans: headteacher read"
  on public.lesson_plans for select
  using (school_id in (
    select school_id from public.profiles
    where id = auth.uid() and role = 'headteacher'
  ));

-- Junction table: one plan can apply to multiple classes
create table public.lesson_plan_classes (
  lesson_plan_id uuid not null references public.lesson_plans(id) on delete cascade,
  class_id       uuid not null references public.classes(id) on delete cascade,
  primary key (lesson_plan_id, class_id)
);
alter table public.lesson_plan_classes enable row level security;

create policy "lesson_plan_classes: teacher manage own"
  on public.lesson_plan_classes for all
  using (lesson_plan_id in (
    select id from public.lesson_plans where teacher_id = auth.uid()
  ));

create policy "lesson_plan_classes: headteacher read"
  on public.lesson_plan_classes for select
  using (lesson_plan_id in (
    select id from public.lesson_plans
    where school_id in (
      select school_id from public.profiles where id = auth.uid() and role = 'headteacher'
    )
  ));
