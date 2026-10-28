# SchoolLink

SchoolLink is a modern school management platform designed for Rwandan schools to connect headteachers, teachers, and parents in one place. It centralizes student records, attendance, academic performance, announcements, and communication while keeping access role-based and secure.

## Overview

This repository contains the frontend application and Supabase configuration for SchoolLink. The app is built with React, TypeScript, and Vite, and uses Supabase for authentication, database, and edge functions.

The platform supports three primary user roles:

- Headteacher: manages academic years, classes, students, teachers, subjects, school settings, announcements, and messaging
- Teacher: records attendance and marks, tracks student performance, and communicates with parents
- Parent: monitors child progress, attendance, and messages from the school

## Features

- Role-based access control for headteachers, teachers, and parents
- Secure authentication with Supabase Auth
- Student and class management
- Subject and academic year management
- Attendance tracking
- Marks and academic performance monitoring
- Parent-facing progress dashboard
- Announcements and messaging
- Responsive dashboard-first UI
- Supabase-backed schema and seed data

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Supabase JS Client
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

## Application Flow

The app routes users based on their role after authentication:

- `/` - landing page
- `/login` - sign-in screen
- `/register` - registration flow
- `/headteacher` - headteacher dashboard
- `/teacher` - teacher dashboard
- `/parent` - parent dashboard
- `/admin/dashboard` - platform admin area

The authentication layer reads the user profile from Supabase and redirects users to the correct dashboard automatically.

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+
- npm or yarn
- A Supabase project

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/irakozeaime2002/SchoolLink.git
cd SchoolLink
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Copy the example environment file and update it with your Supabase credentials:

```bash
cp .env.example .env
```

Then update the values in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server

```bash
npm run dev
```

The app will run locally in the Vite development server, typically at:

```text
http://localhost:5173
```

## Scripts

```bash
npm run dev      # start local development server
npm run build    # create production build
npm run preview  # preview production build locally
npm run lint     # run Oxc lint checks
```

## Supabase Setup

This project depends on Supabase for:

- user authentication
- role-aware user profiles
- school data storage
- announcements and messages
- functions such as phone-to-email lookup for parent login

The database schema and seed data are provided under the `supabase/` folder:

- `supabase/schema.sql` - database schema
- `supabase/seed.sql` - initial seed data
- `supabase/config.toml` - local Supabase configuration
- `supabase/functions/` - server-side functions

## Notes for Contributors

- Keep the role-based access logic consistent with the `profiles` table and user roles.
- Ensure any new pages are protected by the correct route guards.
- Use environment variables prefixed with `VITE_` for frontend access.
- Prefer the existing patterns for page and route organization under `src/pages`.

## License

This project is currently unlicensed unless otherwise specified in the repository.

## Contact

For project questions or collaboration, use the repository owner or project maintainer contact details available in the GitHub repository.
