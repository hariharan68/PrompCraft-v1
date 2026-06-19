# PromptCraft

A full-stack tool for crafting, managing, and saving LLM prompts — via AI generation or reusable templates.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, React Router |
| Backend | FastAPI, SQLAlchemy 2.x, Alembic |
| Database | MSSQL (SQL Server Express, Windows auth) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Auth | JWT (access + refresh tokens), bcrypt |

## Features

- **AI Generator** — describe a goal, pick a domain/tone/format, get a polished LLM prompt powered by Claude
- **Template Generator** — fill-in-the-blank templates with `{{variable}}` placeholders; no AI call needed
- **Prompt Library** — browse and manage all saved prompts
- **History** — full log of past generations
- **Auth** — register, login, protected routes

## Project structure

```
PromptCraft V1/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # pydantic-settings, builds ODBC connection URL
│   │   │   └── database.py     # SQLAlchemy engine + session factory
│   │   └── system/
│   ├── .env                    # local secrets (git-ignored)
│   ├── .env.example            # copy this to .env
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/                # axios wrappers (auth, prompts, templates, ai)
        ├── auth/               # AuthContext + PrivateRoute
        ├── components/         # Layout, Sidebar, Topbar, ResultPanel, etc.
        └── pages/              # Dashboard, Generator, Templates, Library, History
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- SQL Server Express with Windows Authentication
- ODBC Driver 18 for SQL Server
- Anthropic API key (for the AI generator)

## Setup

### 1. Database

Create a database named `PromptCraft` on your local SQL Server Express instance.

```sql
CREATE DATABASE PromptCraft;
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then edit .env with your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`.

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Environment variables

See `backend/.env.example` for all options. The key ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_SERVER` | `localhost\SQLEXPRESS` | SQL Server instance |
| `DB_NAME` | `PromptCraft` | Database name |
| `DB_TRUSTED_CONNECTION` | `true` | Use Windows auth |
| `JWT_SECRET` | *(change this)* | Signs JWT tokens |
| `ANTHROPIC_API_KEY` | — | Required for AI generation |
| `AI_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Get JWT tokens |
| `POST` | `/api/ai/generate` | Generate prompt via Claude |
| `GET` | `/api/templates` | List templates |
| `POST` | `/api/templates/{id}/render` | Render a template with values |
| `GET` | `/api/prompts` | List saved prompts |
| `POST` | `/api/prompts` | Save a prompt |
