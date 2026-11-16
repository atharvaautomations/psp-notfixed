# Quick Setup Guide - PSP Rubber MES v2

## Prerequisites
- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** >= 16.x
- **Docker** & **Docker Compose** (optional, for containerized setup)
- **Git**

---

## Option 1: Local Development Setup (Recommended)

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd psp-rubber-mes-v2-main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` with your local settings:
```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres12345@127.0.0.1:5432/psp_rubber_mes
POSTGRES_DB=psp_rubber_mes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres12345

# Backend API - runs on port 3001
PORT=3001
API_PORT=3001
JWT_SECRET=your-secure-random-secret-key
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=Athu@pspsuperadmin20

# Frontend Web - runs on port 3000 (DIFFERENT from API port)
WEB_PORT=3000

# Development mode - enables auto-login as superadmin
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20

# PLC Service - runs on port 3002
PLC_SERVICE_PORT=3002
```

### 4. Create web/.env.local (Required for Next.js)
```bash
cat > web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_NAME=Super Admin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20
EOF
```

### 5. Start PostgreSQL
```bash
# Option A: Using Docker (recommended)
docker run -d \
  --name rubber-mes-postgres \
  -e POSTGRES_DB=psp_rubber_mes \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres12345 \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-bookworm

# Option B: Use local PostgreSQL installation
# Ensure PostgreSQL is running and database 'psp_rubber_mes' exists
```

### 6. Database Setup (Prisma)
```bash
# Generate Prisma client (run from ROOT directory)
npx prisma generate --schema=api/prisma/schema.prisma

# Run migrations
npx prisma migrate deploy --schema=api/prisma/schema.prisma

# Seed super admin user
node api/prisma/seed-super-admin.js
```

### 7. Start Development Servers (Separate Terminals)
```bash
# Terminal 1: Start API (NestJS) - runs on http://localhost:3001
npm run start:dev --workspace=api

# Terminal 2: Start Web (Next.js) - runs on http://localhost:3000
npm run dev --workspace=web

# Terminal 3 (optional): Start PLC Service - runs on http://localhost:3002
npm run dev --workspace=plc-service
```

### 8. Verify
- **Web App**: http://localhost:3000  (auto-logs in as superadmin in dev mode)
- **API**: http://localhost:3001
- **PLC Service**: http://localhost:3002

---

## Option 2: Docker Compose (Production-like)

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd psp-rubber-mes-v2-main
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` with production values:
```env
POSTGRES_DB=psp_rubber_mes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password-here
API_PORT=3001
JWT_SECRET=very-secure-random-secret-key-256-bit
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=secure-admin-password
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://your-server-ip:3001
PLC_SERVICE_PORT=3002
```

### 3. Build & Start All Services
```bash
docker-compose up -d --build
```

### 4. Verify Services
```bash
docker-compose ps
docker-compose logs -f
```

### 5. Access
- **Web App**: http://localhost:3000 (or `${WEB_PORT}`)
- **API**: http://localhost:3001
- **PLC Service**: http://localhost:3002

### 6. Stop Services
```bash
docker-compose down
```

### 7. Clean Up (volumes included)
```bash
docker-compose down -v
```

---

## Option 3: Manual Production Build

### 1. Build All Workspaces
```bash
# Build API
npm run build --workspace=api

# Build Web
npm run build --workspace=web

# Build PLC Service
npm run build --workspace=plc-service
```

### 2. Run Production
```bash
# Terminal 1: API (runs on PORT=3001)
npm run start --workspace=api

# Terminal 2: Web (runs on PORT=3000)
npm run start --workspace=web

# Terminal 3: PLC Service
npm run start --workspace=plc-service
```

---

## Key Port Configuration

| Service | Port | URL |
|---------|------|-----|
| **Web (Next.js)** | 3000 | http://localhost:3000 |
| **API (NestJS)** | 3001 | http://localhost:3001 |
| **PLC Service** | 3002 | http://localhost:3002 |
| **PostgreSQL** | 5432 | localhost:5432 |

> **Critical**: Web and API must run on DIFFERENT ports. `NEXT_PUBLIC_API_URL` must point to API port (3001), not Web port (3000).

---

## Useful Commands

### Database Operations
```bash
# View database in Prisma Studio
npx prisma studio --schema=api/prisma/schema.prisma

# Reset database (DANGER: deletes all data)
npx prisma migrate reset --schema=api/prisma/schema.prisma

# Create new migration after schema changes
npx prisma migrate dev --name migration_name --schema=api/prisma/schema.prisma

# Pull schema from existing database
npx prisma db pull --schema=api/prisma/schema.prisma
```

### Testing
```bash
# Run all tests
npm test

# Run API tests
npm test --workspace=api

# Run Web tests
npm test --workspace=web
```

### Linting & Formatting
```bash
# Lint all
npm run lint

# Format code
npm run format
```

### Nx Commands
```bash
# Show project graph
npx nx graph

# Run affected projects
npx nx affected:build

# Run affected tests
npx nx affected:test
```

---

## Troubleshooting

### Port Conflicts
```bash
# Check what's using ports (Linux/Mac)
netstat -tulpn | grep -E '3000|3001|3002|5432'

# Check ports (Windows PowerShell)
netstat -ano | findstr "3000 3001 3002 5432"

# Kill process on port (Linux/Mac)
kill -9 $(lsof -t -i:3000)

# Kill process on port (Windows PowerShell)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force
```

### Database Connection Issues
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs rubber-mes-postgres

# Test connection
psql -h localhost -U postgres -d psp_rubber_mes
```

### Prisma Issues
```bash
# Regenerate client
npx prisma generate --schema=api/prisma/schema.prisma

# Clear Prisma cache
rm -rf node_modules/.prisma
npm install
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Authentication Loop (Infinite Redirect)
If login page continuously reloads:
1. Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in both `.env` and `web/.env.local`
2. Ensure API is running on port 3001
3. Ensure Web is running on port 3000
4. Clear browser localStorage: `localStorage.clear()`
5. Restart both servers

---

## Project Structure
```
psp-rubber-mes-v2-main/
├── api/                    # NestJS Backend API
│   ├── prisma/            # Database schema & migrations
│   └── src/
├── web/                   # Next.js Frontend
│   ├── src/
│   └── .env.local         # Next.js specific env (create manually)
├── plc-service/           # PLC Communication Service
├── packages/              # Shared packages
├── docker-compose.yml     # Docker orchestration
├── nx.json                # Nx workspace config
├── package.json           # Root package.json (workspaces)
└── .env                   # Root environment (create from .env.example)
```

---

## Default Credentials (Development)
- **Username**: superadmin
- **Password**: Athu@pspsuperadmin20

> ⚠️ **Change these in production!**

---

## Quick Start Checklist

- [ ] PostgreSQL running on port 5432
- [ ] `.env` created with correct ports (API=3001, Web=3000)
- [ ] `web/.env.local` created with `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [ ] Prisma client generated (`npx prisma generate --schema=api/prisma/schema.prisma`)
- [ ] Migrations applied (`npx prisma migrate deploy --schema=api/prisma/schema.prisma`)
- [ ] Super admin seeded (`node api/prisma/seed-super-admin.js`)
- [ ] API started on port 3001 (`npm run start:dev --workspace=api`)
- [ ] Web started on port 3000 (`npm run dev --workspace=web`)
- [ ] Open http://localhost:3000 in browser