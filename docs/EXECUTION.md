# PromptCraft — Execution & Deployment

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Backend |
| Node.js | 18+ LTS | Frontend (tested on Node 25.7) |
| SQL Server Express | any | Instance: `SRIHARIHARAN\SQLEXPRESS` (Windows auth) |
| ODBC Driver 18 for SQL Server | latest | **Required** by pyodbc — most common setup gotcha |
| Git | any | |

### Verify ODBC driver is installed (PowerShell)

```powershell
Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
```

If nothing returns, download "Microsoft ODBC Driver 18 for SQL Server" from Microsoft and
install it. The backend will fail with `Can't open lib 'ODBC Driver 18...'` without it.

---

## 2. Environment variables — `backend/.env`

Create `backend/.env` (copy from `.env.example` if it exists):

```env
ENV=development
APP_NAME=PromptCraft
VERSION=0.1.0

# MSSQL — Windows auth (no username/password needed)
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=SRIHARIHARAN\SQLEXPRESS
DB_NAME=PromptCraft
DB_TRUSTED_CONNECTION=True
DB_ENCRYPT=no

# JWT — generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=replace-with-64-char-random-hex
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI
ANTHROPIC_API_KEY=sk-ant-...

# CORS
FRONTEND_ORIGIN=http://localhost:5173
```

> Never commit `.env`. Only `.env.example` (no real values) goes into git.

---

## 3. Database setup (one-time)

Open **Azure Data Studio** or **SSMS**, connect to `SRIHARIHARAN\SQLEXPRESS` with
Windows Authentication, and run [SQLQuery1.sql](./SQLQuery1.sql).

That script creates:
- Database `PromptCraft`
- Tables: `Users`, `RefreshTokens`, `Templates`, `Prompts`
- All indexes
- 3 seed system templates (Refactor+Tests, Social Post, SQL From Question)

Then baseline Alembic so future model changes are tracked without recreating tables:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic stamp head
```

---

## 4. Backend setup

```powershell
cd backend

# Create virtual environment (first time only)
python -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

> **Important:** Always use `.\.venv\Scripts\python.exe` explicitly, or activate the venv
> first. Using the system Python will fail with missing package errors.

Verify at **http://localhost:8000/docs** — Swagger UI should show `health`, `auth`,
`templates`, `prompts`, and `ai` sections.

Health check: `http://localhost:8000/api/health` → `{"status":"ok","db":"ok","version":"0.1.0"}`

---

## 5. Frontend setup

```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

App available at **http://localhost:5173**.

The Vite dev server proxies `/api` → `http://localhost:8000`, so there are no CORS issues
in development and the HttpOnly refresh cookie works correctly.

---

## 6. Running both services

Open two PowerShell terminals:

**Terminal 1 — Backend:**
```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Visit **http://localhost:5173** → register an account → log in → dashboard loads.

---

## 7. Database migration workflow (Alembic)

After the initial `alembic stamp head` baseline, use Alembic only for schema *changes*:

```powershell
# After editing SQLAlchemy models:
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "add column X"

# Review the generated script in alembic/versions/ ...

# Apply
.\.venv\Scripts\python.exe -m alembic upgrade head

# Roll back last migration
.\.venv\Scripts\python.exe -m alembic downgrade -1

# Show current revision
.\.venv\Scripts\python.exe -m alembic current
```

> Do NOT let Alembic autogenerate/recreate the existing tables — they were created by
> hand in T-SQL. The stamp baseline marks them as already applied.

---

## 8. Testing

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

Frontend type-check + lint:
```powershell
cd frontend
npm run build    # Vite build catches import errors
```

---

## 9. Production deployment

### Architecture

```
Internet (HTTPS)
       │
┌──────▼──────────┐
│  CDN / LB (TLS) │
└───┬─────────┬───┘
    │  /api   │
    ▼         ▼
Nginx/CDN  ┌──────────────────┐    ┌──────────────┐
(static)   │ FastAPI pods (xN) │───▶│  Azure SQL    │
           └─────────┬────────┘    └──────────────┘
                     │ HTTPS
                     ▼
             Anthropic Claude API
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl gnupg unixodbc-dev \
 && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
 && curl https://packages.microsoft.com/config/debian/12/prod.list \
    > /etc/apt/sources.list.d/mssql-release.list \
 && apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### Production `.env` changes

```env
ENV=production
DB_SERVER=<azure-sql-host>.database.windows.net
DB_TRUSTED_CONNECTION=False
DB_USER=<sql-user>
DB_PASSWORD=<sql-password>
DB_ENCRYPT=yes
JWT_SECRET=<64-char-secret-from-secret-manager>
FRONTEND_ORIGIN=https://yourdomain.com
ANTHROPIC_API_KEY=<from-secret-manager>
```

### Production checklist

- [ ] `ENV=production`, `secure=True` cookies, HTTPS enforced
- [ ] `JWT_SECRET` from a secret manager (not `.env` file)
- [ ] `FRONTEND_ORIGIN` set to the real domain (locks CORS)
- [ ] DB credentials via managed identity or secret manager
- [ ] Health checks wired to the load balancer (`GET /api/health`)
- [ ] Structured JSON logs shipped to a central sink
- [ ] Alerts on 5xx rate spikes and refresh-reuse events
- [ ] Nightly job: `DELETE FROM RefreshTokens WHERE ExpiresAt < SYSUTCDATETIME() OR Revoked = 1`
- [ ] Rate limiting on `/api/auth/login` and `/api/ai/generate`
- [ ] Dependency scans: `pip-audit` + `npm audit` passing

---

## 10. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r backend/requirements.txt
      - run: ruff check backend/
      - run: pytest backend/tests -q

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "18" }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

**CD options:**
- Backend → Azure Container Apps / AWS ECS / Fly.io (deploy container image)
- Frontend static → S3 + CloudFront, Vercel, or Netlify
- Database → **Azure SQL** is the natural production target for MSSQL

---

## 11. Common issues & fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Can't open lib 'ODBC Driver 18...'` | Driver not installed | Install msodbcsql18 (§1) |
| `(trapped) error reading bcrypt version` | bcrypt ≥ 4.1 with passlib 1.7.4 | Pin `bcrypt==4.0.1` in requirements.txt |
| `ImportError: cannot import name '...'` | Missing `__init__.py` in feature package | Create empty `app/<feature>/__init__.py` |
| Login timeout / DB unreachable | Wrong instance name or server stopped | Check `DB_SERVER=SRIHARIHARAN\SQLEXPRESS`; start SQL Server service |
| CORS error in browser | Origin mismatch | Confirm `FRONTEND_ORIGIN=http://localhost:5173` in `.env` |
| Refresh cookie not sent | `withCredentials` missing or SameSite mismatch | Vite proxy handles this in dev; in prod ensure same domain or proper CORS |
| 401 loop on frontend | Refresh endpoint failing | Check cookie path is `/api/auth`; check `secure` flag in dev |
| Column not found (PawordHash) | Column name typo in DB | Run `EXEC sp_rename 'dbo.Users.PawordHash', 'PasswordHash', 'COLUMN'` |
| `IF OBJECT_ID` guard skips table re-create | Script re-run skips existing tables | Expected behavior; alter columns individually if schema changes needed |
