-- Optional hardening for assessments + marks. The app works without it.
-- Run in the Supabase SQL editor.

-- 1. Remove duplicate marks (keep the most recently updated one per student per assessment)
delete from public.marks m
using public.marks newer
where m.assessment_id = newer.assessment_id
  and m.student_id = newer.student_id
  and (coalesce(m.updated_at, m.created_at), m.id) < (coalesce(newer.updated_at, newer.created_at), newer.id);

-- 2. One mark per student per assessment
alter table public.marks
  add constraint marks_assessment_student_key unique (assessment_id, student_id);

-- 3. Deleting an assessment deletes its marks
alter table public.marks drop constraint marks_assessment_id_fkey;
alter table public.marks
  add constraint marks_assessment_id_fkey
  foreign key (assessment_id) references public.assessments(id) on delete cascade;

-- 4. One "Term 1/2/3" per academic year
alter table public.terms
  add constraint terms_year_name_key unique (academic_year_id, name);

-- 5. One attendance record per student per day (keep the latest duplicate)
delete from public.attendance a
using public.attendance newer
where a.student_id = newer.student_id
  and a.date = newer.date
  and (a.created_at, a.id) < (newer.created_at, newer.id);
alter table public.attendance
  add constraint attendance_student_date_key unique (student_id, date);

-- 6. One row per subject per class (keep the one with a teacher, then the first)
delete from public.class_subjects c
using public.class_subjects keep
where c.class_id = keep.class_id
  and c.subject_id = keep.subject_id
  and c.id <> keep.id
  and ((c.teacher_id is null and keep.teacher_id is not null)
       or ((c.teacher_id is null) = (keep.teacher_id is null) and c.id > keep.id));
alter table public.class_subjects
  add constraint class_subjects_class_subject_key unique (class_id, subject_id);
