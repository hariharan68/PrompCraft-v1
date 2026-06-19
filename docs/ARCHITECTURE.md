# PromptCraft — Architecture

---

## 1. System overview (C4 — Level 1)

```
                      ┌────────────────────────┐
                      │         User            │
                      │  (browser, any device)  │
                      └───────────┬────────────┘
                                  │ HTTPS
                                  ▼
                      ┌────────────────────────┐
                      │   React SPA (Vite 5)    │
                      │   localhost:5173 (dev)  │
                      └───────────┬────────────┘
                                  │ REST / JSON  (Bearer JWT)
                                  ▼
                      ┌────────────────────────┐
                      │   FastAPI (Python 3.11) │
                      │   localhost:8000 (dev)  │
                      └────┬──────────────┬────┘
                           │              │ HTTPS
               SQLAlchemy  │              ▼
                           ▼     ┌─────────────────────┐
              ┌─────────────────┐│  Anthropic Claude API│
              │  SQL Server     │└─────────────────────┘
              │  Express        │
              │  Windows auth   │
              └─────────────────┘
```

---

## 2. Container diagram (C4 — Level 2)

```
Browser
├── Auth pages (Login / Register)      access token → memory/localStorage
├── App shell (Sidebar + Topbar)       refresh token → httpOnly cookie
├── Generator (3 modes)
├── Templates + Library
└── History / Favorites
        │  Axios + 401 silent-refresh interceptor
        ▼
FastAPI Application
├── auth router       /api/auth/…
├── templates router  /api/templates/…
├── prompts router    /api/prompts/…
├── ai router         /api/ai/…
└── system router     /api/health
        │ Service layer (business logic)
        │ Repository layer (SQLAlchemy 2.x)
        ▼
SQL Server Express  (SRIHARIHARAN\SQLEXPRESS, Windows auth)
Tables: Users  RefreshTokens  Templates  Prompts
```

---

## 3. Tech stack

### Backend

| Technology | Version | Role |
|------------|---------|------|
| Python | 3.11 | Language |
| FastAPI | ≥0.110 | ASGI web framework, auto Swagger |
| Uvicorn | ≥0.27 | ASGI server |
| Pydantic v2 | ≥2.6 | Request/response validation |
| pydantic-settings | ≥2.2 | Typed `.env` → Settings singleton |
| SQLAlchemy | ≥2.0 | ORM (2.x mapped_column API) |
| pyodbc | ≥5.1 | MSSQL driver bridge |
| Alembic | ≥1.13 | DB migration tracking |
| python-jose[cryptography] | ≥3.3 | JWT encode/decode (HS256) |
| passlib[bcrypt] | ≥1.7 | bcrypt password hashing |
| **bcrypt** | **==4.0.1** | **Pinned — passlib 1.7.4 incompatible with ≥4.1** |
| python-multipart | ≥0.0.9 | OAuth2 form-body parsing |
| anthropic | latest | Official Claude SDK |

### Frontend

| Technology | Version | Role |
|------------|---------|------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool / HMR dev server |
| React Router | 6.x | Client-side routing, protected routes |
| Axios | 1.x | HTTP client with interceptors |
| Tailwind CSS | 3.x | Utility-first styling |
| Lucide React | latest | Icon set |

### Infrastructure

| Component | Choice |
|-----------|--------|
| Database | SQL Server Express, instance `SRIHARIHARAN\SQLEXPRESS` |
| Auth | Windows Authentication (Trusted_Connection=yes) |
| ODBC driver | ODBC Driver 18 for SQL Server |
| AI provider | Anthropic Claude API (`claude-sonnet-4-6`) |
| CI | GitHub Actions (lint + build) |
| Production DB | Azure SQL (managed MSSQL) |

---

## 4. Backend — layered architecture

```
┌──────────────────────────────────────────────────┐
│  Router  (app/<feature>/router.py)                │
│  HTTP verbs, status codes, DI (get_db / get_user) │
├──────────────────────────────────────────────────┤
│  Schema  (app/<feature>/schemas.py)               │
│  Pydantic request/response models                 │
├──────────────────────────────────────────────────┤
│  Service  (app/<feature>/service.py)              │
│  Business logic, orchestration                    │
├──────────────────────────────────────────────────┤
│  Repository  (app/<feature>/repository.py)        │
│  SQLAlchemy SELECT/INSERT/UPDATE, no logic        │
├──────────────────────────────────────────────────┤
│  Model  (app/<feature>/models.py)                 │
│  SQLAlchemy ORM → MSSQL tables (PascalCase cols)  │
├──────────────────────────────────────────────────┤
│  Core  (app/core/)                                │
│  config · database · security · deps              │
└──────────────────────────────────────────────────┘
```

**Dependency rules:** higher layers import lower; routers never touch the DB directly;
services never import FastAPI request objects.

```
router ──▶ service ──▶ repository ──▶ models
  │           │
  └──▶ schemas └──▶ core.security / core.config
```

### Folder structure

```
backend/
├── app/
│   ├── main.py                  # create_app(), CORS, router mounts
│   ├── core/
│   │   ├── config.py            # pydantic-settings Settings singleton
│   │   ├── database.py          # engine, SessionLocal, Base, get_db
│   │   ├── security.py          # hash_password, verify_password, JWT, token hash
│   │   └── deps.py              # get_current_user dependency
│   ├── auth/
│   │   ├── models.py            # User, RefreshToken ORM models
│   │   ├── schemas.py           # RegisterIn, UserOut, TokenOut
│   │   ├── repository.py        # get_user_by_email, add_refresh_token, …
│   │   ├── service.py           # register, authenticate, login, refresh, logout
│   │   └── router.py            # /register /login /refresh /logout /me
│   ├── templates/
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── repository.py
│   │   └── router.py            # GET /templates, GET /templates/{id}, POST /render
│   ├── prompts/
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── repository.py
│   │   ├── service.py
│   │   └── router.py            # CRUD + pagination + ownership
│   ├── ai/
│   │   ├── schemas.py
│   │   ├── service.py           # AIService → Claude API
│   │   └── router.py            # POST /ai/generate
│   └── system/
│       └── router.py            # GET /api/health
├── alembic/                     # migration versions
├── tests/
├── requirements.txt
├── alembic.ini
└── .env
```

### Request lifecycle example — `GET /api/prompts`

```
HTTP Request
  → Router.list_prompts()
  → Depends(get_current_user)   — decodes JWT, validates user is active
  → Depends(get_db)             — opens SQLAlchemy session
  → PromptService.list_for_user(user.id, filters, pagination)
  → PromptRepository.find_by_user(db, user.id, ...)
  → SQLAlchemy SELECT ... WHERE UserId = ?
  ← [Prompt ORM rows]
  ← PromptOut schema (from_attributes=True)
  ← JSON 200 { items, total, limit, offset }
```

---

## 5. Frontend — layer structure

```
frontend/src/
├── main.jsx                     # React bootstrap, Router, AuthProvider
├── App.jsx                      # Route table
├── api/
│   ├── client.js                # Axios instance, Bearer attach, 401 → refresh → retry
│   ├── auth.js
│   ├── templates.js
│   ├── prompts.js
│   └── ai.js
├── auth/
│   ├── AuthContext.jsx          # login/logout/user state, bootstrap on load
│   └── PrivateRoute.jsx         # redirect to /login if not authenticated
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Generator.jsx            # tab: AI / Template / Library
│   ├── Templates.jsx
│   ├── Library.jsx
│   └── History.jsx
├── components/
│   ├── Layout.jsx               # Sidebar + Topbar shell
│   └── CopyButton.jsx
└── utils/
    └── errors.js                # extractError() for both { detail } and 422 array
```

**Vite dev proxy** (`vite.config.js`): `/api` → `http://localhost:8000` — no CORS in dev,
refresh cookie works because same origin from the browser's perspective.

---

## 6. Database schema

### ERD

```
Users (1) ──────────────── (*) RefreshTokens
  │                              UserId FK → Users.Id CASCADE
  │
  │ (1) ──────────────────────── (*) Prompts
  │                              UserId FK → Users.Id CASCADE
  │                              TemplateId FK → Templates.Id (NO ACTION)
  │
Templates (1) ──────────── (*) Prompts
  CreatedBy FK → Users.Id (SET NULL on delete)
```

### Tables

**Users**

| Column | Type | Notes |
|--------|------|-------|
| Id | BIGINT IDENTITY PK | |
| Email | NVARCHAR(256) UNIQUE NOT NULL | Login identifier |
| PasswordHash | NVARCHAR(255) NOT NULL | bcrypt hash |
| FullName | NVARCHAR(256) NULL | Display name |
| IsActive | BIT DEFAULT 1 | Soft-disable |
| CreatedAt | DATETIME2 DEFAULT SYSUTCDATETIME() | UTC |
| UpdatedAt | DATETIME2 NULL | Set by app on edit |

**RefreshTokens**

| Column | Type | Notes |
|--------|------|-------|
| Id | BIGINT IDENTITY PK | |
| UserId | BIGINT FK CASCADE | |
| TokenHash | NVARCHAR(255) UNIQUE | SHA-256 of raw token (never store raw) |
| ExpiresAt | DATETIME2 | UTC |
| Revoked | BIT DEFAULT 0 | Set on rotation/logout |
| ReplacedByTokenHash | NVARCHAR(255) NULL | Rotation chain for theft detection |
| UserAgent | NVARCHAR(512) NULL | Audit |
| IpAddress | NVARCHAR(45) NULL | Audit |
| CreatedAt | DATETIME2 DEFAULT SYSUTCDATETIME() | |

**Templates**

| Column | Type | Notes |
|--------|------|-------|
| Id | BIGINT IDENTITY PK | |
| Name | NVARCHAR(150) NOT NULL | |
| Domain | NVARCHAR(50) NOT NULL | coding/writing/business/education/data/creative |
| Body | NVARCHAR(MAX) NOT NULL | Contains `{{variable}}` placeholders |
| VariablesJson | NVARCHAR(MAX) NULL | JSON array of variable definitions |
| IsSystem | BIT DEFAULT 1 | 0 = user-created |
| CreatedBy | BIGINT FK SET NULL | NULL = system template |
| CreatedAt | DATETIME2 DEFAULT SYSUTCDATETIME() | |

**Prompts**

| Column | Type | Notes |
|--------|------|-------|
| Id | BIGINT IDENTITY PK | |
| UserId | BIGINT FK CASCADE | Owner |
| TemplateId | BIGINT FK NO ACTION NULL | Source template |
| Title | NVARCHAR(200) NULL | |
| Content | NVARCHAR(MAX) NOT NULL | The generated prompt |
| Domain | NVARCHAR(50) NULL | |
| Mode | NVARCHAR(20) CHECK IN ('template','ai','library') | |
| IsFavorite | BIT DEFAULT 0 | |
| CreatedAt | DATETIME2 DEFAULT SYSUTCDATETIME() | |
| UpdatedAt | DATETIME2 NULL | |

### Key indexes

```sql
CREATE UNIQUE INDEX IX_Users_Email       ON dbo.Users(Email);
CREATE INDEX IX_RT_UserId               ON dbo.RefreshTokens(UserId);
CREATE INDEX IX_RT_ExpiresAt            ON dbo.RefreshTokens(ExpiresAt) WHERE Revoked = 0;
CREATE INDEX IX_Prompts_User_Created    ON dbo.Prompts(UserId, CreatedAt DESC);
CREATE INDEX IX_Prompts_User_Fav        ON dbo.Prompts(UserId, IsFavorite) WHERE IsFavorite = 1;
CREATE INDEX IX_Templates_Domain        ON dbo.Templates(Domain);
```

> FK design note: `Templates.CreatedBy` uses `ON DELETE SET NULL` and
> `Prompts.TemplateId` uses `NO ACTION` to avoid the MSSQL "multiple cascade paths" error.

---

## 7. API contract

Base path: `/api`. All bodies JSON. All timestamps UTC ISO-8601.
Auth: `Authorization: Bearer <access_token>` on protected (🔒) endpoints.

### Auth `/api/auth`

| Method | Path | Auth | Description | Success |
|--------|------|:----:|-------------|---------|
| POST | /register | – | Create account `{email, password, full_name}` | 201 UserOut |
| POST | /login | – | OAuth2 form `username`+`password` | 200 TokenOut + refresh cookie |
| POST | /refresh | cookie | Rotate refresh token | 200 TokenOut + new cookie |
| POST | /logout | cookie | Revoke + clear cookie | 204 |
| GET | /me | 🔒 | Current user | 200 UserOut |

**TokenOut:** `{ access_token, token_type: "bearer", expires_in: 1800 }`
**UserOut:** `{ id, email, full_name, is_active, created_at }`

### Templates `/api/templates`  🔒

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| GET | /templates?domain= | List templates (filter by domain) | 200 TemplateOut[] |
| GET | /templates/{id} | Get single template | 200 TemplateOut |
| POST | /templates/{id}/render | Substitute `{{vars}}` (no AI) | 200 `{content}` |

**TemplateOut:** `{ id, name, domain, body, variables: [{name, label, type, required}], is_system, created_by }`

### Prompts `/api/prompts`  🔒  (ownership enforced)

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| GET | /prompts?limit=20&offset=0&favorite=&domain= | Paginated list | 200 `{items, total, limit, offset}` |
| POST | /prompts | Save prompt `{title, content, domain, mode, template_id}` | 201 PromptOut |
| GET | /prompts/{id} | Get one | 200 / 404 |
| PATCH | /prompts/{id} | Update `{title?, is_favorite?}` | 200 PromptOut |
| DELETE | /prompts/{id} | Delete | 204 |

### AI `/api/ai`  🔒

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| POST | /ai/generate | `{goal, domain, tone, output_format}` → Claude | 200 `{generated_prompt, model, tokens_used}` |

Errors: `429` rate limited · `502` Claude unavailable.

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | `{status, db, version}` liveness probe |

### Error shapes

```json
{ "detail": "message" }                         // 400 / 401 / 403 / 404 / 409
{ "detail": [{"loc": [...], "msg": "...", "type": "..."}] }  // 422 Pydantic
```

---

## 8. Design patterns

| Pattern | Location | Benefit |
|---------|----------|---------|
| Repository | `*/repository.py` | DB logic isolated; mockable in tests |
| Service / Application layer | `*/service.py` | Business logic framework-agnostic |
| Dependency Injection | FastAPI `Depends()` | Clean wiring of DB session + auth |
| DTO / Schema | Pydantic `schemas.py` | API contract decoupled from ORM model |
| App Factory | `create_app()` in `main.py` | Testable; settings injected at creation |
| Interceptor | Axios request/response | Centralized JWT attach + 401 silent refresh |
| Context Provider | React `AuthContext` | Global session without prop-drilling |

---

## 9. Non-functional targets

| Attribute | Target | Mechanism |
|-----------|--------|-----------|
| Performance | p95 < 200ms (non-AI) | Async I/O, DB indexes, connection pool |
| Scalability | Horizontal API pods | Stateless JWT, no server-side session |
| Availability | 99.9% | Health checks → load balancer |
| Security | OWASP Top 10 | See SECURITY.md |
| Observability | Structured logs + /health | JSON logs, request IDs |

---

## 10. Production topology

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
           │ (stateless)       │    │  (MSSQL)      │
           └─────────┬────────┘    └──────────────┘
                     │ HTTPS
                     ▼
             Anthropic Claude API
```
