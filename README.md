# SchoolLink

SchoolLink is a school–parent platform built to keep schools and families connected through one digital system. It helps headteachers, teachers, and parents monitor student progress, track attendance, share announcements, and support learners more effectively.

This project is designed for schools in Rwanda and follows a multi-tenant architecture, where multiple schools can use the same platform while keeping their data completely separate and secure.

## Project Vision

In many schools, parents only receive a final result at the end of the term. Teachers often detect difficulties too late, and headteachers have to gather information manually from many sources. SchoolLink solves this by making academic progress, attendance, support actions, and communication visible all year round.

The platform helps schools:

- monitor student performance over time
- detect learners needing support early
- keep parents informed in real time
- reduce manual reporting work
- strengthen communication between school and home

## Who It Is For

### Headteacher / School Admin
- manages teachers, classes, subjects, and students
- views school-wide performance and class trends
- monitors intervention progress
- configures school settings and grading rules

### Teacher
- records attendance and marks
- tracks student performance
- writes teacher observations and comments
- creates interventions for learners needing support
- shares homework and notices with parents

### Parent / Guardian
- follows a child's marks and attendance
- sees school announcements and messages
- views student progress over time
- receives alerts for important updates

## Core Product Goals

1. Help every child succeed by improving communication between school and home.
2. Replace paper-based follow-up with a digital, secure system.
3. Give teachers data to identify support needs early.
4. Give headteachers a clearer picture of school performance.
5. Keep parents informed without needing to wait for end-of-term reports.

## Current Features Included

The current implementation already includes the foundations for a strong school management platform:

- role-based authentication with Supabase
- school and profile management
- academic years and terms
- classes, subjects, and students
- parent-to-student relationship tracking
- assessments and marks
- attendance recording
- announcements and messages
- interventions and support tracking
- school-level settings for grading and attendance rules
- secure multi-school data structure

## Missing / Planned Features to Complete the Product

These are the most important features still needed to turn the app into a complete school–parent platform.

### 1. Student Progress Dashboard
A dedicated page for each student showing:

- overall subject average
- performance by subject
- attendance summary
- recent assessments
- teacher comments
- weak areas and support needs
- trend over time

This is one of the most important features for the app.

### 2. Trend Analysis and Performance Insights
The app should automatically compare performance across terms and identify patterns such as:

- improvement over time
- subjects with declining performance
- students falling below expected average
- class performance comparisons
- at-risk learners

This feature turns the platform from a record system into a decision-support tool.

### 3. Homework Management
Teachers should be able to:

- create homework for a class or subject
- assign due dates
- attach notes or resources
- view completion status
- notify parents

Parents should be able to see upcoming homework and due dates for their child.

### 4. Attendance Alerts and Notifications
The app should notify parents when a child is marked absent or late and show attendance trends over time.

Examples:

- same-day absent alert
- repeated lateness warning
- weekly attendance summary
- parent notification preferences

### 5. Intervention Workflow
The schema includes interventions, which is excellent. The next step is to build the full workflow:

- identify learner difficulty
- create support action
- assign responsible person
- set review date
- track before and after results
- evaluate whether the intervention worked

This is a key feature for early support and school improvement.

### 6. Report Cards and Printable Reports
The system should generate:

- student report cards
- class performance summaries
- school progress summaries
- term-based academic reports
- attendance and support recommendations

This makes the platform useful for both parents and administrators.

### 7. School Calendar and Planning
A school calendar should combine:

- exams
- tests
- meetings
- events
- holidays
- homework deadlines
- parent-teacher meeting schedules

Users should only see the items relevant to them.

### 8. Parent–Teacher Communication and Feedback
The product needs a complete communication channel for:

- teacher-to-parent messages
- announcements to selected groups
- parent concerns and questions
- meeting requests
- tracking concerns from open to resolved

This improves trust and makes communication easier.

### 9. Multi-Tenant Security and RLS
This is critical for production readiness.

The app should enforce:

- school isolation using school_id
- teacher access restricted to their school
- parents only seeing their own children
- headteachers only seeing their school data
- admins managing platform-wide systems

### 10. Real Dashboard Analytics for Admins and Headteachers
Headteachers need school dashboards with summaries such as:

- number of students per class
- class performance comparison
- attendance rate by class
- subject performance overview
- students needing support
- intervention status summary

## Recommended MVP Scope

The fastest and most valuable version of this product should focus on these five areas:

1. Student profile and parent linkage
2. Teacher marks and attendance tracking
3. Student progress analytics
4. Parent dashboard
5. Intervention and support tracking

These features deliver the highest value to real users and match the core problem the platform is solving.

## Future Growth Roadmap

### Phase 1: MVP
- login and role-based access
- student, class, and subject management
- marks and attendance
- basic parent dashboard
- basic teacher dashboard
- headteacher overview

### Phase 2: Engagement and Communication
- announcements
- messages
- attendance alerts
- homework module
- parent feedback flow

### Phase 3: Insight and Support
- trend analysis
- intervention tracking
- report generation
- at-risk student summaries

### Phase 4: Advanced Features
- AI support suggestions
- school calendar
- personalized recommendations
- advanced analytics
- meeting scheduling and reminders

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Edge Functions
- Recharts
- Lucide React

## Project Structure

```text
SchoolLink/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── functions/
│   ├── config.toml
│   ├── schema.sql
│   └── seed.sql
├── .env.example
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.ts
└── README.md
```

## Supabase Foundation

The project is built around a Supabase backend with schema and seed data already included.

Important files:

- `supabase/schema.sql` — database schema
- `supabase/seed.sql` — seed data
- `supabase/config.toml` — Supabase local setup
- `supabase/functions/` — edge functions and server-side logic

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/irakozeaime2002/SchoolLink.git
cd SchoolLink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Update the values in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the app

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Scripts

```bash
npm run dev      # start the development server
npm run build    # build the production app
npm run preview  # preview the production build locally
npm run lint     # run lint checks
```

## Notes for Development

- keep all role-based access consistent with the `profiles` table
- ensure queries are scoped by `school_id`
- keep parent access limited to their own children
- design dashboards around real school workflows, not just CRUD screens
- prefer simple and clear interfaces for parents and teachers

## Final Summary

SchoolLink is a modern school management and parent communication platform built to improve student outcomes through better visibility, earlier intervention, and stronger communication between home and school.

The foundation is already in place, and the remaining work is mostly about developing the real workflows that make the platform useful to schools in daily practice.

The most important features still to add are:

- student progress dashboards
- trend analysis
- homework management
- attendance alerts
- intervention tracking
- report generation
- parent communication workflows
- school analytics and dashboards

## License

This project currently does not declare a specific license in the repository.
