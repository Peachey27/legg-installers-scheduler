LEGG Installers Scheduler
=========================

Digital corkboard-style scheduler for LEGG site installers.

Tech stack:
- Next.js 14 App Router
- TypeScript
- TailwindCSS
- Drizzle ORM + SQLite (better-sqlite3)
- Zustand
- @hello-pangea/dnd
- date-fns

Quick start:

1. Install deps (pnpm, npm or yarn):

   pnpm install

2. Copy env file:

   cp .env.example .env.local

   Then edit `.env.local` and set:

   INSTALLER_SCHEDULER_PASSWORD=your-password
   DATABASE_FILENAME=installer_scheduler.db

3. Run DB seed:

   pnpm seed

4. Start dev server:

   pnpm dev

   Open http://localhost:3000 and log in with the shared password.

Notes:

- Desktop: drag and drop between Backlog and Mon–Fri columns.
- Mobile: view-only, day tabs with index-card style jobs.
- File uploads via /api/upload save into public/uploads (dev only).
- Jobs are soft-deleted with `deletedAt`.
- Print view: open any job, click "Print card" to open /jobs/[id]/print.
