# Orbit — Project Management App

Monorepo: SolidJS frontend + Express/PostgreSQL backend + Nginx reverse proxy, orchestrated with Docker Compose.

## 🚀 Quick Deploy (Recommended)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum change:
- `JWT_SECRET` — a long random string
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — admin panel credentials
- `SMTP_*` — mail server for OTP and password reset emails

### 2. Start

```bash
docker compose up --build -d
```

This builds and starts four services:

| Service    | Purpose                              | Port (host)  |
|------------|--------------------------------------|--------------|
| `nginx`    | Reverse proxy, routes `/api` → backend, `/` → frontend | `80` |
| `frontend` | SolidJS SPA served via `serve`       | (internal)   |
| `backend`  | Express API, auto-migrates + seeds DB on startup | `3001` (internal) |
| `database` | PostgreSQL 16 with persistent volume | `5432`       |

### 3. Access

- **Client portal**: http://localhost
- **Insider login**: http://localhost/insider/login
- **Admin panel**: http://localhost/admin

### 4. Subsequent runs (no rebuild needed)

```bash
docker compose up -d
```

Add `--build` only when source files change:

```bash
docker compose up --build -d
```

---

## 🛠 Manual Setup (Development)

### Backend

```bash
cd backend
npm install
```

Start the database:

```bash
docker compose -f ../compose.yaml up -d database
```

Push schema and seed:

```bash
npm run db:generate
npm run db:push
npm run seed:run
```

Start the dev server (hot-reload):

```bash
npm run start
```

> Backend listens on `http://localhost:3001` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> Vite dev server on `http://localhost:3000`, proxies `/api` → `localhost:3001`.

---

## 🔐 Roles & Access

| Role         | Access                                                                 |
|--------------|------------------------------------------------------------------------|
| **Admin**    | User/Token management, database backup download, approve signups       |
| **Supervisor** | Create projects/phases/tasks, forward resolutions to issues          |
| **Developer**  | Accept tasks, submit for review                                      |
| **QA**         | Approve submitted tasks                                              |
| **Client**     | View projects, create/view issues (via share token link)             |

---

## 👥 Seeded Users

All seeded users share the password: **`password123`**

| Name                    | Email                | Role         |
|-------------------------|----------------------|--------------|
| Francis Roel L. Abarca  | francis@gmail.com    | Supervisor   |
| Marcus Webb             | marcus@gmail.com     | Supervisor   |
| Priya Sharma            | priya@gmail.com      | QA           |
| Alex Chen               | alex@gmail.com       | Developer    |
| Diana Osei              | diana@gmail.com      | Developer    |

token:id seed
`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`

**Admin panel**: login with the credentials set in your `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

---

## 📦 Database Backup

Admins can download a JSON dump of all database tables from the Admin Panel (**📥 Backup JSON** button), or directly via:

```
GET /api/admin/backup          → all tables
GET /api/admin/backup?table=X  → single table
```

---

## 🏗 Architecture

```
nginx (port 80)
  ├── /           → frontend  (SolidJS + Vite, port 4173)
  ├── /api/*      → backend   (Express + Drizzle + PostgreSQL, port 3001)
  └── /images/*   → backend   (static file serving)
```

- **Auth**: JWT in httpOnly cookie (`taskCookie`, 4h expiry)
- **Database**: PostgreSQL 16, Drizzle ORM with Postgres.js

