# Login System Fix - PSP Rubber MES v2

## Problem: Infinite Login Page Redirect Loop

### Root Cause Analysis

The original GitHub version has **three critical misconfigurations** that create an infinite redirect loop:

| Misconfiguration | Original Value | Problem |
|-----------------|----------------|---------|
| **API Port** | Defaults to 3000 (main.ts:22) | Conflicts with Web port |
| **Web Port** | Defaults to 3000 (next dev) | Same port as API |
| **NEXT_PUBLIC_API_URL** | `http://192.168.1.30:3000` (LAN IP) | Points to wrong/unreachable host |

### The Infinite Loop Flow

```
1. User opens http://localhost:3000 (Web)
2. AuthProvider initializes → Dev mode enabled → Calls NEXT_PUBLIC_API_URL/auth/login
3. NEXT_PUBLIC_API_URL = http://192.168.1.30:3000 (WRONG - LAN IP, not localhost)
4. API call FAILS (connection refused / wrong host)
5. AuthProvider catches error → Sets loading=false, user=null
6. LoginPage renders → Sees DEVELOPMENT_MODE=true → Immediately router.replace('/')
7. AuthGuard on '/' → Sees no user → router.replace('/login')
8. Back to step 6 → INFINITE LOOP
```

---

## Manual Fix for Fresh GitHub Zip/Clone

### Step 1: Extract and Navigate
```bash
unzip psp-rubber-mes-v2-main.zip
cd psp-rubber-mes-v2-main
```

### Step 2: Create Root .env (Fix Ports & API URL)
```bash
cat > .env << 'EOF'
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres12345@127.0.0.1:5432/psp_rubber_mes
POSTGRES_DB=psp_rubber_mes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres12345

# Backend API - MUST be different from Web port
PORT=3001
API_PORT=3001
JWT_SECRET=RANDOM_SECRET_KEY
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=Athu@pspsuperadmin20

# Frontend Web - MUST be different from API port
WEB_PORT=3000

# Development Mode - Auto-login as superadmin
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20

# PLC Service
PLC_SERVICE_PORT=3002
EOF
```

### Step 3: Create web/.env.local (Next.js Requires This)
```bash
cat > web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_NAME=Super Admin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20
EOF
```

### Step 4: Fix Web Package.json (Explicit Port 3000)
```bash
# Edit web/package.json
# Change "dev": "next dev" to "dev": "next dev -p 3000"
# Change "start": "next start" to "start": "next start -p 3000"

# Using sed (Linux/Mac/Git Bash):
sed -i 's/"dev": "next dev"/"dev": "next dev -p 3000"/' web/package.json
sed -i 's/"start": "next start"/"start": "next start -p 3000"/' web/package.json

# Windows PowerShell:
# (Get-Content web/package.json) -replace '"dev": "next dev"', '"dev": "next dev -p 3000"' | Set-Content web/package.json
# (Get-Content web/package.json) -replace '"start": "next start"', '"start": "next start -p 3000"' | Set-Content web/package.json
```

### Step 5: Fix Login Page (Remove Immediate Dev Redirect)
**File:** `web/src/app/login/page.tsx`

**Find lines 22-31:**
```tsx
useEffect(() => {
  if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true') {
    router.replace('/');
    return;
  }

  if (!loading && user) {
    router.replace('/');
  }
}, [loading, user, router]);
```

**Replace with:**
```tsx
useEffect(() => {
  if (!loading && user) {
    router.replace('/');
  }
}, [loading, user, router]);
```

**Why:** The original code immediately redirects to `/` when dev mode is enabled, **before** AuthProvider finishes auto-login. This causes the redirect loop. The fix waits for auth loading to complete.

### Step 6: Install Dependencies
```bash
npm install
```

### Step 7: Start PostgreSQL (Docker)
```bash
docker run -d \
  --name rubber-mes-postgres \
  -e POSTGRES_DB=psp_rubber_mes \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres12345 \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-bookworm
```

### Step 8: Database Setup (Prisma)
```bash
# Generate Prisma client
npx prisma generate --schema=api/prisma/schema.prisma

# Run migrations
npx prisma migrate deploy --schema=api/prisma/schema.prisma

# Seed super admin user
node api/prisma/seed-super-admin.js
```

### Step 9: Start Servers (Two Separate Terminals)

**Terminal 1 - API on port 3001:**
```bash
npm run start:dev --workspace=api
```
Verify: `API running on 0.0.0.0:3001`

**Terminal 2 - Web on port 3000:**
```bash
npm run dev --workspace=web
```
Verify: `Local: http://localhost:3000`

### Step 10: Access Application
Open browser: **http://localhost:3000**

Auto-logs in as superadmin (dev mode).

---

## Verification Checklist

- [ ] API running on http://localhost:3001
- [ ] Web running on http://localhost:3000
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:3001` in both `.env` and `web/.env.local`
- [ ] No port conflicts (check `netstat -ano \| findstr "3000 3001"`)
- [ ] PostgreSQL running on port 5432
- [ ] Browser opens http://localhost:3000 without redirect loop
- [ ] Dev mode auto-login works (shows dashboard)

---

## File Changes Summary

| File | Original | Fixed |
|------|----------|-------|
| `.env` | `WEB_PORT=3000`, `NEXT_PUBLIC_API_URL=http://192.168.1.30:3000` | `PORT=3001`, `API_PORT=3001`, `WEB_PORT=3000`, `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| `web/.env.local` | Missing or wrong | `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| `web/package.json` | `"dev": "next dev"` | `"dev": "next dev -p 3000"` |
| `web/src/app/login/page.tsx` | Auto-redirect in dev mode | Waits for auth loading |

---

## Why This Fixes It

1. **Separate Ports**: API (3001) ≠ Web (3000) → No conflict
2. **Correct API URL**: `NEXT_PUBLIC_API_URL=http://localhost:3001` → Frontend reaches backend
3. **Dev Login Works**: AuthProvider calls correct API → Gets token → Sets user → Loading completes
4. **Login Page Waits**: No premature redirect → AuthGuard sees authenticated user → Allows access

---

## Docker Deployment (No Changes Needed)

The `docker-compose.yml` already uses correct internal ports:
- API container: port 3000 (mapped to `${API_PORT}`)
- Web container: port 3001 (mapped to `${WEB_PORT}`)

Just ensure `.env` has:
```env
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://your-server-ip:3001
```

---

## Quick One-Command Fix (Linux/Mac/Git Bash)

```bash
cd psp-rubber-mes-v2-main && \
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres12345@127.0.0.1:5432/psp_rubber_mes
POSTGRES_DB=psp_rubber_mes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres12345
PORT=3001
API_PORT=3001
JWT_SECRET=RANDOM_SECRET_KEY
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=Athu@pspsuperadmin20
WEB_PORT=3000
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20
PLC_SERVICE_PORT=3002
EOF
cat > web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_PUBLIC_DEV_USERNAME=superadmin
NEXT_PUBLIC_DEV_NAME=Super Admin
NEXT_PUBLIC_DEV_PASSWORD=Athu@pspsuperadmin20
EOF
sed -i 's/"dev": "next dev"/"dev": "next dev -p 3000"/' web/package.json
sed -i 's/"start": "next start"/"start": "next start -p 3000"/' web/package.json
sed -i '/if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === .true.) {/,/return;/d' web/src/app/login/page.tsx
npm install
```
Then start PostgreSQL, run Prisma commands, and start both servers.