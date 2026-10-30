## Test Accounts

| Role | Email | Password |
|---|---|---|
| Headteacher | irakoze@gmail.com | 123456 |
| Teacher | john1@gmail.com | 123456 |
| Parent | parent@gmail.com | Parent1 |
| Admin | admin@gmail.com | Admin@1 |

Deployed link: schoolmerge.vercel.app

# SchoolLink

SchoolLink is a digital platform that helps schools and families follow learners’ academic progress and stay connected. Headteachers, teachers, and parents can access relevant student information, assessments, attendance, support activities, announcements, and messages in one place. The platform is designed for schools in Rwanda, with each school’s information kept within its own school context.

SchoolLink is designed to support the Government of Rwanda’s priorities for education, human-capital development, and digital transformation, as expressed in the *National Strategy for Transformation (NST2), 2024–2029*, and *Rwanda Vision 2050*. By bringing learner records, assessment results, attendance, and school–family communication together in a digital platform, SchoolLink can help schools monitor progress and coordinate learner support. This describes the project’s intended alignment with national priorities; it is not a claim of official endorsement or proven impact.

**References:** Government of Rwanda, *National Strategy for Transformation (NST2), 2024–2029*; Government of Rwanda, *Rwanda Vision 2050*.

## Problem specification

Schools need reliable ways to organize learner information and follow academic progress, attendance, and support needs over time. When these records are difficult to review or share, teachers and school leaders may have less visibility into learner progress, and families may find it harder to stay informed and coordinate with the school.

The education reports and statistical yearbook in the `data/` folder provide national-level context about Rwanda’s education sector. They do not, on their own, establish how individual schools manage records or communicate with families. SchoolLink addresses that school-level need by bringing student information, marks, attendance, interventions, announcements, and messages together in one platform.

The intended outcome is to make relevant information easier for school staff and families to access and to support more coordinated learner support. These are project goals; the platform’s impact should be assessed through its use in schools.

## Data, dashboards, and user interaction

### Data used by the application

SchoolLink uses Supabase for authentication and to store the records displayed in the application. These records include schools, user profiles and roles, academic years, classes, subjects, students, assessments, marks, attendance, announcements, messages, and interventions.

The Excel workbooks in the `data/` folder provide education-sector reference material. The application does not currently import those workbooks to populate its dashboards. Dashboard information comes from the school records stored in Supabase. During development, the project’s seed script can also create sample records for testing.

### What the dashboards communicate

The information shown depends on the signed-in user’s role:

- **Platform administrators** see the schools registered on SchoolLink and the total number of users.
- **Headteachers** see school-level counts for students, teachers, and classes, along with class and subject assessment averages and pending teacher requests.
- **Teachers** see summaries for their assigned classes, including student counts, assessments, and recorded attendance.
- **Parents and guardians** can view information for their linked children, including assessment results, attendance, announcements, and messages.

These dashboards are intended to help users review school activity and learner progress. They present records entered into the system; they should not be treated as independent research findings or as a guarantee of academic outcomes.

### How users interact with SchoolLink

Users sign in and access pages appropriate to their assigned role. Headteachers manage school information and review school-level summaries. Teachers work with their classes and record academic and attendance information. Parents select a linked child to review available progress and attendance information and use the communication pages to stay informed.

The information available to each user depends on the records entered for their school and account. Empty dashboards may mean that data has not yet been added or linked.

## Project vision

SchoolLink aims to help schools and families work together throughout the academic year, rather than relying only on occasional or end-of-term updates.

The project’s goals are to:

- make learner progress and attendance easier to follow
- support timely communication between schools and families
- help teachers and school leaders coordinate support for learners
- give school leaders a clearer view of school activity
- provide a digital foundation for managing school information

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