-- ============================================================
-- SchoolLink — Seed Data
-- Run AFTER creating the 4 users in Supabase Dashboard
-- Authentication → Users → Add user
--
-- Users to create first:
--   admin@schoollink.rw       password: Admin@1234
--   headteacher@schoollink.rw password: Head@1234
--   teacher@schoollink.rw     password: Teacher@1234
--   parent@schoollink.rw      password: Parent@1234
-- ============================================================

do $$
declare
  v_admin_id       uuid;
  v_headteacher_id uuid;
  v_teacher_id     uuid;
  v_parent_id      uuid;

  v_school_id      uuid;
  v_year_id        uuid;
  v_term_id        uuid;
  v_class_s2a_id   uuid;
  v_class_s1b_id   uuid;
  v_subj_physics   uuid;
  v_subj_math      uuid;
  v_subj_chemistry uuid;
  v_subj_english   uuid;
  v_subj_biology   uuid;
  v_student_jean   uuid;
  v_student_alice  uuid;
  v_student_eric   uuid;
  v_assessment_1   uuid;
  v_assessment_2   uuid;
  v_assessment_3   uuid;
begin

  -- --------------------------------------------------------
  -- Get user IDs from auth.users by email
  -- --------------------------------------------------------
  select id into v_admin_id       from auth.users where email = 'admin@schoollink.rw';
  select id into v_headteacher_id from auth.users where email = 'headteacher@schoollink.rw';
  select id into v_teacher_id     from auth.users where email = 'teacher@schoollink.rw';
  select id into v_parent_id      from auth.users where email = 'parent@schoollink.rw';

  -- --------------------------------------------------------
  -- SCHOOL
  -- --------------------------------------------------------
  insert into public.schools (id, name, code, address)
  values (gen_random_uuid(), 'Kigali Excellence School', 'KES-001', 'KG 5 Ave, Kigali, Rwanda')
  returning id into v_school_id;

  -- --------------------------------------------------------
  -- PROFILES
  -- --------------------------------------------------------
  -- Delete auto-created profiles from trigger (if any) then re-insert with school_id
  delete from public.profiles where id in (v_admin_id, v_headteacher_id, v_teacher_id, v_parent_id);

  insert into public.profiles (id, full_name, role, school_id, phone) values
    (v_admin_id,       'Admin User',              'platform_admin', null,         '+250 788 000 000'),
    (v_headteacher_id, 'Dr. Kalisa Jean',          'headteacher',    v_school_id,  '+250 788 100 001'),
    (v_teacher_id,     'Mr. Aime Nshimiyimana',    'teacher',        v_school_id,  '+250 788 100 002'),
    (v_parent_id,      'Mrs. Uwase Marie',         'parent',         v_school_id,  '+250 788 100 003');

  -- --------------------------------------------------------
  -- ACADEMIC YEAR
  -- --------------------------------------------------------
  insert into public.academic_years (id, school_id, name, start_date, end_date, is_current)
  values (gen_random_uuid(), v_school_id, '2025', '2025-01-01', '2025-12-31', true)
  returning id into v_year_id;

  -- --------------------------------------------------------
  -- TERM
  -- --------------------------------------------------------
  insert into public.terms (id, academic_year_id, name, start_date, end_date, is_current)
  values (gen_random_uuid(), v_year_id, 'Term 1', '2025-01-06', '2025-04-11', true)
  returning id into v_term_id;

  -- --------------------------------------------------------
  -- CLASSES
  -- --------------------------------------------------------
  insert into public.classes (id, school_id, academic_year_id, name, teacher_id)
  values (gen_random_uuid(), v_school_id, v_year_id, 'S2 A', v_teacher_id)
  returning id into v_class_s2a_id;

  insert into public.classes (id, school_id, academic_year_id, name, teacher_id)
  values (gen_random_uuid(), v_school_id, v_year_id, 'S1 B', v_teacher_id)
  returning id into v_class_s1b_id;

  -- --------------------------------------------------------
  -- SUBJECTS
  -- --------------------------------------------------------
  insert into public.subjects (id, school_id, name, code) values
    (gen_random_uuid(), v_school_id, 'Physics',     'PHY') returning id into v_subj_physics;
  insert into public.subjects (id, school_id, name, code) values
    (gen_random_uuid(), v_school_id, 'Mathematics', 'MTH') returning id into v_subj_math;
  insert into public.subjects (id, school_id, name, code) values
    (gen_random_uuid(), v_school_id, 'Chemistry',   'CHM') returning id into v_subj_chemistry;
  insert into public.subjects (id, school_id, name, code) values
    (gen_random_uuid(), v_school_id, 'English',     'ENG') returning id into v_subj_english;
  insert into public.subjects (id, school_id, name, code) values
    (gen_random_uuid(), v_school_id, 'Biology',     'BIO') returning id into v_subj_biology;

  -- --------------------------------------------------------
  -- STUDENTS
  -- --------------------------------------------------------
  insert into public.students (id, school_id, class_id, full_name, date_of_birth, status)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, 'Jean Mugisha',    '2010-03-12', 'active')
  returning id into v_student_jean;

  insert into public.students (id, school_id, class_id, full_name, date_of_birth, status)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, 'Alice Uwimana',   '2010-07-05', 'active')
  returning id into v_student_alice;

  insert into public.students (id, school_id, class_id, full_name, date_of_birth, status)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, 'Eric Habimana',   '2010-01-20', 'active')
  returning id into v_student_eric;

  -- Extra students in S1 B
  insert into public.students (id, school_id, class_id, full_name, date_of_birth, status) values
    (gen_random_uuid(), v_school_id, v_class_s1b_id, 'Grace Ineza',         '2011-09-08', 'active'),
    (gen_random_uuid(), v_school_id, v_class_s1b_id, 'Patrick Nkurunziza',  '2011-02-14', 'active');

  -- --------------------------------------------------------
  -- PARENT → STUDENT LINK (Mrs. Uwase is Jean's parent)
  -- --------------------------------------------------------
  insert into public.parent_students (parent_id, student_id)
  values (v_parent_id, v_student_jean);

  -- --------------------------------------------------------
  -- ASSESSMENTS (Physics, S2 A, Term 1, by teacher)
  -- --------------------------------------------------------
  insert into public.assessments (id, school_id, class_id, subject_id, term_id, teacher_id, title, type, max_score, date)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, v_subj_physics, v_term_id, v_teacher_id, 'Quiz 1', 'quiz', 20, '2025-02-10')
  returning id into v_assessment_1;

  insert into public.assessments (id, school_id, class_id, subject_id, term_id, teacher_id, title, type, max_score, date)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, v_subj_physics, v_term_id, v_teacher_id, 'Test 1', 'test', 40, '2025-03-05')
  returning id into v_assessment_2;

  insert into public.assessments (id, school_id, class_id, subject_id, term_id, teacher_id, title, type, max_score, date)
  values (gen_random_uuid(), v_school_id, v_class_s2a_id, v_subj_physics, v_term_id, v_teacher_id, 'Exam',   'exam', 80, '2025-04-01')
  returning id into v_assessment_3;

  -- --------------------------------------------------------
  -- MARKS
  -- --------------------------------------------------------
  -- Jean
  insert into public.marks (assessment_id, student_id, score, comment) values
    (v_assessment_1, v_student_jean,  14, 'Good effort'),
    (v_assessment_2, v_student_jean,  28, 'Electricity section needs more practice'),
    (v_assessment_3, v_student_jean,  58, 'Improved from last term');

  -- Alice
  insert into public.marks (assessment_id, student_id, score, comment) values
    (v_assessment_1, v_student_alice, 12, null),
    (v_assessment_2, v_student_alice, 24, null),
    (v_assessment_3, v_student_alice, 52, null);

  -- Eric
  insert into public.marks (assessment_id, student_id, score, comment) values
    (v_assessment_1, v_student_eric,  16, null),
    (v_assessment_2, v_student_eric,  30, null),
    (v_assessment_3, v_student_eric,  62, null);

  -- --------------------------------------------------------
  -- ATTENDANCE (last 5 school days for Jean)
  -- --------------------------------------------------------
  insert into public.attendance (school_id, class_id, student_id, teacher_id, date, status, note) values
    (v_school_id, v_class_s2a_id, v_student_jean, v_teacher_id, '2025-04-07', 'present', null),
    (v_school_id, v_class_s2a_id, v_student_jean, v_teacher_id, '2025-04-08', 'absent',  'No reason provided'),
    (v_school_id, v_class_s2a_id, v_student_jean, v_teacher_id, '2025-04-09', 'present', null),
    (v_school_id, v_class_s2a_id, v_student_jean, v_teacher_id, '2025-04-10', 'late',    'Arrived 15 minutes late'),
    (v_school_id, v_class_s2a_id, v_student_jean, v_teacher_id, '2025-04-11', 'present', null);

  -- --------------------------------------------------------
  -- ANNOUNCEMENTS
  -- --------------------------------------------------------
  insert into public.announcements (school_id, author_id, title, body, audience) values
    (v_school_id, v_headteacher_id,
     'End of term exams schedule published',
     'The exam timetable for Term 1 is now available. Please check the school calendar.',
     'all'),
    (v_school_id, v_headteacher_id,
     'Parent-teacher meeting — 10 April',
     'All parents are invited to attend the parent-teacher meeting on 10 April at 14:00.',
     'parents'),
    (v_school_id, v_teacher_id,
     'Physics homework due tomorrow',
     'S2 A students: complete exercises 4.1–4.5 from the textbook.',
     'class');

  -- --------------------------------------------------------
  -- MESSAGES (teacher → parent)
  -- --------------------------------------------------------
  insert into public.messages (school_id, sender_id, recipient_id, body, read) values
    (v_school_id, v_teacher_id, v_parent_id,
     'Good morning Mrs. Uwase. Jean is making good progress in Physics. His electricity scores improved after the extra exercises.',
     false),
    (v_school_id, v_parent_id, v_teacher_id,
     'Thank you for the update, Mr. Aime. We will keep encouraging him at home.',
     false);

  -- --------------------------------------------------------
  -- INTERVENTION
  -- --------------------------------------------------------
  insert into public.interventions (school_id, student_id, teacher_id, problem, action, responsible, review_date, status, score_before)
  values (
    v_school_id, v_student_jean, v_teacher_id,
    'Electricity scores dropped across 3 consecutive assessments',
    'Extra worked examples and short practice exercises on Ohm''s law. Practical demonstration planned.',
    'Mr. Aime Nshimiyimana',
    '2025-04-15',
    'in_progress',
    54
  );

  raise notice 'Seed completed successfully.';
  raise notice 'School ID: %', v_school_id;
  raise notice 'Headteacher ID: %', v_headteacher_id;
  raise notice 'Teacher ID: %', v_teacher_id;
  raise notice 'Parent ID: %', v_parent_id;

end;
$$;
