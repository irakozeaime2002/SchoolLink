# SchoolLink

SchoolLink is a school–parent platform built to help schools and families stay connected around every learner’s progress. It gives headteachers, teachers, and parents a simple way to track student performance, attendance, interventions, announcements, and communication in one place.

The platform is designed for schools in Rwanda and follows a multi-tenant model, where each school remains isolated while using the same shared system.

## Project vision

In many schools, parents receive information only at the end of a term, while teachers often detect learning issues too late and headteachers still rely on manual reporting. SchoolLink changes that by making performance, attendance, support needs, and communication visible throughout the academic year.

The main goals are to:

- help every child succeed by improving school–home communication
- replace paper-based reporting with a digital system
- identify struggling learners early and support them before problems grow
- give headteachers a clear picture of school performance
- keep parents informed in real time without waiting for end-of-term results

## Who it is for

### Headteacher / School Admin
- manages teachers, classes, subjects, and students
- views school-wide performance and class trends
- monitors intervention progress
- configures school settings and academic structure

### Teacher
- records attendance and marks
- tracks student performance over time
- writes comments and observations
- creates interventions for learners needing support
- posts homework and school notices
- communicates with parents

### Parent / Guardian
- follows a child’s academic performance
- checks attendance and school updates
- views announcements and messages
- receives alerts for important school events or absences

## Core features

### 1. Student profile management
- student identity and contact details
- class assignment and academic year grouping
- parent–child relationship linking
- status tracking such as active, transferred, or graduated

### 2. Academic tracking
- subject-based assessment management
- marks and score entry for quizzes, tests, assignments, projects, and exams
- automatic percentage calculation
- grade and performance overview by subject and term

### 3. Attendance tracking
- daily attendance status for each learner
- present, absent, late, or excused records
- quick visibility for teachers and parents
- attendance trend analysis over time

### 4. Intervention and support workflow
- identifies students needing additional support
- records teacher intervention plans
- tracks action, responsible person, and review date
- compares performance before and after support actions

### 5. Announcements and communication
- school-wide, class-level, or parent-specific notices
- teacher-to-parent messaging
- notifications for important updates
- parent–teacher meeting scheduling support

### 6. Reporting and insights
- class dashboards and school dashboards
- trend analysis across terms and subjects
- weak topics and support opportunities highlighted clearly
- parent-friendly summaries of child progress

## Product highlights

SchoolLink is designed to be more than a gradebook. It combines academic records, learner support insights, and communication tools so the school and home can work together effectively.

It focuses on:

- progress over time, not just final results
- supportive language around learners needing help
- actionable school insights for better decisions
- secure school-level separation in a shared platform

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- Supabase
- Recharts
- Lucide React

## Project structure

```text
SchoolLink/
├─ public/
├─ src/
│  ├─ components/
│  ├─ context/
│  ├─ lib/
│  ├─ pages/
│  ├─ types/
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ index.css
├─ supabase/
│  ├─ schema.sql
│  ├─ seed.sql
│  └─ config.toml
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
└─ vercel.json
```

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the app:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Supabase setup

This project uses Supabase for authentication, postgresql data storage, and multi-tenant organization.

Important database components include:

- schools
- profiles
- academic_years
- terms
- classes
- subjects
- students
- assessments
- marks
- attendance
- announcements
- messages
- interventions

The SQL schema and seed data for the application are included in the `supabase/` directory.

## Important features to add next

The current app already has a strong base. To make it production-ready and aligned with the product vision, these are the most important additions:

### High priority
- role-based access control for headteacher, teacher, and parent accounts
- school-specific data isolation and secure multi-tenant enforcement
- parent authentication flow and password reset support
- real-time notifications and alerts for attendance and marks updates
- secure CRUD flows for announcements, messages, and student records
- attendance summary and school-wide reporting dashboards

### Important product features
- student progress analytics across terms and subjects
- teacher observation notes and intervention tracking history
- homework posting with due-date visibility for parents
- parent–teacher meeting creation and confirmation
- printable student reports and end-of-term summaries
- AI-assisted insight recommendations grounded in school data

### Business and quality improvements
- audit logging for sensitive educational records
- data validation rules for marks, scores, and attendance
- file upload support for student documents and profile photos
- export to PDF/CSV for reports and school records
- onboarding flow for new schools
- notification preferences per parent and teacher

## Roadmap

### MVP
- school setup and user roles
- student, class, and subject management
- marks and attendance tracking
- announcements and messaging
- intervention workflows
- teacher and parent dashboards

### Next stage
- reporting and trend analytics
- AI-supported learning insights
- richer communication features
- mobile-focused improvements
- export tools and administrative automation

## Notes

This project is intentionally focused on a realistic school-management workflow and a clear MVP direction. It aims to balance educational usefulness with a simple, maintainable architecture suitable for a modern React + Supabase application.