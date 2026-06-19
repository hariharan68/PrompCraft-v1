# PromptCraft — Engineering Docs

**Stack:** React 18 + Vite · FastAPI · Microsoft SQL Server Express · Claude API (Anthropic)

> Full-stack LLM prompt-crafting platform. Users register, log in, and generate high-quality
> prompts via three modes: template-based, AI meta-prompt, and library browse/customize.

---

## Documents

| File | Covers |
|------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, tech stack, DB schema, backend/frontend layers, API contract, data flows |
| [FEATURES.md](./FEATURES.md) | Product vision, use cases, generation modes, personas, domains, roadmap |
| [EXECUTION.md](./EXECUTION.md) | Local setup (Windows + MSSQL), running the project, production deployment, CI/CD, troubleshooting |
| [SECURITY.md](./SECURITY.md) | JWT auth design, token rotation, threat model, OWASP mapping, pre-launch checklist |
| [SQLQuery1.sql](./SQLQuery1.sql) | Hand-written T-SQL: tables, indexes, seed templates |

---

## Quick start

```powershell
# 1 — backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# set .env (see EXECUTION.md)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# 2 — frontend (new terminal)
cd frontend
npm install
npm run dev
```

- API explorer: **http://localhost:8000/docs**
- App: **http://localhost:5173**

See [EXECUTION.md](./EXECUTION.md) for the full setup including `.env` values and DB creation.

---

## Build status

| Service | Status |
|---------|--------|
| Phase 0 — Foundation | ✅ Done |
| Phase 1 — Auth (JWT) | ✅ Done |
| Phase 2 — Templates   | 🔨 In progress |
| Phase 3 — Prompts (history/favorites) | ⬜ Pending |
| Phase 4 — AI generate | ⬜ Pending |
| Phase 5 — Library + custom templates | ⬜ Pending |
| Phase 6 — Hardening & production | ⬜ Pending |

_Last updated: 2026-06-20_
