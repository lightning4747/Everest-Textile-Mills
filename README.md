# Everest Textile Mills ERP

A manufacturing ERP system for Everest Textile Mills built with TypeScript, Bun, Express, PostgreSQL, Drizzle ORM, Zod, Docker, Prometheus, Grafana, and k6.

---

## Architecture Overview

- **Backend:** Express on Bun (`backend/`)
- **Database:** PostgreSQL 16 with Drizzle ORM (`backend/src/db/`)
- **Observability:** Prometheus metrics (`/metrics`) and Grafana
- **Testing:** k6 load testing scenarios (`k6/`)
- **Frontend:** React + Vite (`frontend/`)

---

## Quick Start (Docker)

1. **Environment Setup:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. **Boot All Services:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify System Health:**
   ```bash
   curl http://localhost:3000/health
   # Returns: {"success":true,"data":{"status":"healthy",...}}
   ```

4. **Run Migrations & Seed Data:**
   ```bash
   docker compose exec backend bun run db:migrate
   docker compose exec backend bun run seed
   ```

5. **Access Service Interfaces:**
   - **Backend API:** [http://localhost:3000](http://localhost:3000)
   - **Health Check:** [http://localhost:3000/health](http://localhost:3000/health)
   - **Prometheus Metrics:** [http://localhost:3000/metrics](http://localhost:3000/metrics)
   - **Prometheus UI:** [http://localhost:9090](http://localhost:9090)
   - **Grafana UI:** [http://localhost:3001](http://localhost:3001) (User: `admin`, Pass: `admin`)

---

## Local Development (Without Docker)

### 1. Prerequisites
- [Bun](https://bun.sh/) (v1.1+ installed: `curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL running on `localhost:5432` with database `everest_erp`

### 2. Backend Setup
In `backend/`:
```bash
# Install backend dependencies
bun install

# Run database migrations & seed initial records
bun run db:migrate
bun run seed

# Start backend development server
bun run dev
```

### 3. Frontend Setup
In `frontend/`:
```bash
# Install frontend dependencies
bun install

# Start Vite development server with HMR
bun run dev

# Typecheck and build production distribution
bun run build

# Preview production build locally
bun run preview
```

---

## ⚡ Bun Command Cheat Sheet (Migration Reference)

The entire Everest Textile Mills repository (both frontend & backend) standardizes on **Bun** instead of npm/yarn.

| Action | Old (npm) | New (Bun) |
| :--- | :--- | :--- |
| **Install all dependencies** | `npm install` | `bun install` |
| **Add dependency** | `npm install <pkg>` | `bun add <pkg>` |
| **Add dev dependency** | `npm install -D <pkg>` | `bun add -d <pkg>` |
| **Remove dependency** | `npm uninstall <pkg>` | `bun remove <pkg>` |
| **Run script** | `npm run <script>` | `bun run <script>` (or `bun <script>`) |
| **Execute binary directly** | `npx <pkg>` | `bunx <pkg>` |
| **Lockfile** | `package-lock.json` | `bun.lock` |


---

## Parallel Development Plan

The backend implementation work has been divided between two developers:
- **Person A (`feat/person-a`):** Yarn Management, Machine Fleet, and Shop Floor Operations. Detailed instructions in [`tasks/person-a.md`](./tasks/person-a.md).
- **Person B (`feat/person-b`):** Sales Orders, Production Orders, Quality Control, and Dispatches. Detailed instructions in [`tasks/person-b.md`](./tasks/person-b.md).
- **Final Shared Phase:** Dashboard KPIs and Executive Reports.
