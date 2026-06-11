# Copilot Instructions

## Build, Test, and Lint Commands

### Backend (`backend/`)

From `backend/`:
- `npm run setup` — Start Postgres container + install deps + generate & run drizzle migrations
- `npm run start` — Start backend server (tsx --watch) + Postgres container in parallel
- `npm run super-start` — Full bootstrap: setup → seed → start
- `npm run seed` — Seed database with test data

From `backend/backend-server/`:
- `npm run start` — Dev server with hot reload (`npx tsx --env-file=../.env --watch src/index.ts`)
- `npm run db:generate` — Generate Drizzle migrations from schema (requires running DB)
- `npm run db:migrate` — Apply pending Drizzle migrations (requires running DB)
- `npm run db:push` — Push schema directly to DB, bypassing migration files
- `npm run seed` — Insert seed data (requires running DB)
- `npx tsc --noEmit` — TypeScript type-check (no build output)

No test framework is currently configured.

### Frontend (`frontend/`)

- `npm run dev` or `npm start` — Vite dev server on port 3000 (proxies `/api` to `localhost:3001`)
- `npm run build` — Production build to `dist/`
- `npm run serve` — Preview production build

## Architecture

**Orbit** — a project management app. Monorepo with a backend API and SolidJS frontend connected via Vite proxy.

### Backend (Express + PostgreSQL + Drizzle ORM)
- `backend/backend-server/` — Express 5 API server with TypeScript. Entry: `src/index.ts`. Routes in `src/routes.ts`.
- `backend/database-server/` — `compose.yaml` running PostgreSQL 16 on port 5432.
- DB layer: `src/lib/db/` — Drizzle ORM with Postgres.js client. Schema in `schema.ts`, queries in `getter.ts`/`setter.ts`, connection in `index.ts`.
- Auth: JWT via `jose` library. `src/lib/auth/index.ts` — token creation/verification with `{ userId, role, username }` payload. Admin login uses hardcoded env credentials. User login uses bcrypt-hashed passwords from the `users` table.
- Auth middleware: `src/lib/auth/middleware.ts` — `authorize` extracts JWT payload into `res.locals`, `requireRole(...roles)` gates by role (Admin bypasses all checks).
- WebSocket: Simple broadcast relay at `/ws` — sends received messages to all connected clients.
- Env vars loaded from `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`, `HOST`.
- API routes are under `/api/`. Public routes (no auth): health, projects/project/phases reads, admin/user login/signup, comments read. Protected routes require JWT cookie; role-gated routes use `requireRole()`.

### Frontend (SolidJS + Vite + Tailwind CSS v4)
- Entry: `src/index.tsx` — router setup with `@solidjs/router` v0.16
- Routes:
  - `/` — **Client page** (public): view projects, expand phases, read/post comments. No login needed; comments are posted anonymously via shared session cookie.
  - `/insider/login` — Login/signup page. Signups go to pending state for admin approval.
  - `/insider` — **Insider portal** (auth required): project list with create-project modal (Supervisor only). Uses `InsiderLayout` with sidebar.
  - `/insider/project/:id` — Project detail with three views switchable via `?view=dashboard|board|list`. Includes create-phase modal (Supervisor), create-task modal (Supervisor), task detail modal, and role-gated task workflow buttons (Developer accept/submit, QA approve, Client toggle phase state).
  - `/admin` — **Admin panel**: login with hardcoded env credentials, then manage users (approve/reject pending signups, change roles).
- Data layer: `src/lib/fetch.ts` defines types and async API functions that call `/api/*` endpoints (credentials: 'include'). `src/lib/store.ts` manages session state and project cache.
- Vite config proxies `/api` to `http://localhost:3001`.
- Styling: Tailwind CSS v4 via `@tailwindcss/vite` plugin, dark theme (`bg-[#0B0B0C]` base).

### Data Model
- **Project** (`projects` table) → has **Phases** (`phases` table, FK `project_id`) → each Phase has **Tasks** (`tasks` table, FK `phase_id`)
- **Users** table: `name`, `username` (unique), `passwordHash`, `role`, `approved` (pending/approved/rejected)
- **Comments** table: FK to `phases` and `users`, with `content` and `createdAt`
- Task state workflow: `backlog` → `in-progress` (Developer accepts) → `to review` (Developer submits) → `QA approved` (QA approves)
- Phase states: `UAT` ↔ `Complete` (toggled by Client)
- Roles: `Supervisor`, `QA`, `Developer`, `Client`
- Admin is a special role authenticated via env credentials, with full access

## Key Conventions

- Backend TypeScript uses `.ts` extensions in import paths (`import { x } from "./routes.ts"`) — required for `tsx` runtime.
- Backend env vars: all in `backend/.env`, loaded once in `src/lib/env/index.ts`, then re-exported. Never use `process.env` directly elsewhere.
- Backend Drizzle config: `drizzle.config.ts` reads schema from `src/lib/db/schema.ts`, dialect `postgresql`, strict mode on.
- All mutating DB operations go through setter functions in `src/lib/db/setter.ts`; all reads through getter functions in `src/lib/db/getter.ts`. Routes never access `db` directly.
- Frontend API calls all go through `src/lib/fetch.ts`. Components should never use `fetch()` directly — call the typed functions instead.
- Frontend uses SolidJS primitives: `createSignal` for local state, `createResource` for async data, `createStore` for shared reactive state.
- JWT tokens are sent as httpOnly cookies (`inscriberCookie` with `Bearer <token>` format). The frontend includes `credentials: 'include'` on all fetch calls.
- Password hashing uses bcryptjs with 10 salt rounds. User passwords created during signup, admin credentials are env vars.
- Database schema changes require running `npm run db:generate` and `npm run db:migrate` (or `db:push` for dev) after the Postgres container is running.

