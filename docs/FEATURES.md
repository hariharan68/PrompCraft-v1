# PromptCraft — Features & Use Cases

---

## 1. Vision

**PromptCraft** is a web platform that helps anyone — beginners to power users — write
better prompts for Large Language Models.

> **One-line pitch:** "Turn a vague idea into a precise, high-performing LLM prompt in seconds."

### Problem

| Pain | Who feels it | Today's workaround |
|------|--------------|--------------------|
| Don't know how to phrase a prompt | New AI users | Trial and error |
| Inconsistent prompt quality across a team | Teams | Copy-pasting from chats |
| Re-writing the same prompts repeatedly | Power users | Personal notes |
| No structure for role / tone / format | Everyone | Guesswork |

---

## 2. Three generation modes

### Mode 1 — Template-based
Pick a use-case template (e.g. "Refactor + Tests"), fill in the dynamic fields
(language, code, test framework), and get a fully-structured prompt assembled on the
server. **No AI involved** — pure variable substitution.

### Mode 2 — AI meta-prompt
Describe a goal in plain English (e.g. "summarize a research paper professionally").
The backend calls **Claude** (`claude-sonnet-4-6`) which returns an optimized,
production-ready prompt for that goal.

### Mode 3 — Library browse & customize
Browse a curated library of prompts organized by domain. One-click to fill variables
and customize, then save or copy.

---

## 3. Core use cases

| ID | Use Case | Mode | Outcome |
|----|----------|------|---------|
| UC-1 | Register a new account | Auth | User row created, JWT tokens issued |
| UC-2 | Log in | Auth | Access token + HttpOnly refresh cookie |
| UC-3 | Generate prompt from template | Template | Structured prompt assembled server-side |
| UC-4 | Generate optimized prompt from goal | AI | Claude returns refined prompt |
| UC-5 | Browse + customize a library prompt | Library | Prompt with substituted variables |
| UC-6 | Save a prompt to history | Persistence | Prompt stored to `Prompts` table |
| UC-7 | Mark a prompt as favorite | Persistence | `IsFavorite` toggled |
| UC-8 | Refresh an expired session | Auth | New access token without re-login |
| UC-9 | Log out | Auth | Refresh token revoked, cookie cleared |
| UC-10 | Browse history with pagination | History | Paginated, filterable prompt list |
| UC-11 | Delete a prompt | History | Hard delete, ownership enforced |

---

## 4. Target personas

### Persona A — "Maya, the Marketer"
Non-technical. Wants on-brand copy prompts fast.
Uses **template mode**: picks "Marketing → Social post", sets tone = playful.

### Persona B — "Dev Dan, the Engineer"
Technical. Wants precise coding prompts.
Uses **library mode**: grabs "Refactor + add tests", tweaks variables.

### Persona C — "Priya, the Power User"
Advanced. Knows what she wants but wants it optimized.
Uses **AI mode**: types a goal, gets a tuned prompt back from Claude.

---

## 5. Prompt domains

| Domain | Use cases |
|--------|-----------|
| **Coding** | Debug, explain, refactor, write tests, generate boilerplate |
| **Writing** | Blog posts, emails, social media, summaries |
| **Business** | Proposals, reports, meeting notes, OKRs |
| **Education** | Lesson plans, quizzes, explanations by grade level |
| **Data** | SQL queries, analysis prompts, chart specs |
| **Creative** | Storytelling, brainstorming, naming, ideation |

---

## 6. Feature list

### Authentication
- Email + password registration (bcrypt, min 8 chars)
- JWT login: 30-minute access token + 7-day HttpOnly refresh cookie
- Silent token refresh (Axios interceptor, no user interruption)
- Refresh token rotation with reuse/theft detection
- Logout revokes token + clears cookie

### Generator
- Three-tab interface: AI / Template / Library
- Domain, tone, and output format selectors
- Real-time loading state during AI generation
- Copy-to-clipboard on any generated prompt
- Save to history with one click

### Templates
- Server-side `{{variable}}` substitution (no AI, instant)
- Dynamic form generated from template's `variables` JSON
- Domain filter to narrow the template list
- System templates (seed data) + user-created templates (future)

### Library
- Browse curated prompts by domain
- Search by keyword
- One-click customize and copy

### History
- Full paginated list of all saved prompts (newest first)
- Favorite/unfavorite toggle
- Delete with confirmation
- Filter to favorites only
- Domain badge on each card

---

## 7. Success metrics (v1 targets)

| Metric | Target |
|--------|--------|
| Register → first prompt conversion | > 60% |
| Prompts generated / active user / week | > 10 |
| Median time-to-first-prompt | < 60 seconds |
| Auth error rate (login / refresh) | < 0.5% |
| API p95 latency (non-AI endpoints) | < 200 ms |

---

## 8. Delivery roadmap

| Phase | Theme | Status |
|-------|-------|--------|
| 0 — Foundation | Repo scaffold, health endpoint, blank React UI | ✅ Done |
| 1 — Auth (JWT) | Register, login, refresh, logout, /me, AuthContext | ✅ Done |
| 2 — Templates | GET /templates, render endpoint, Templates page | 🔨 In progress |
| 3 — Prompts | CRUD history, favorites, pagination | ⬜ Pending |
| 4 — AI generate | Claude integration, POST /ai/generate | ⬜ Pending |
| 5 — Library | Browse by domain, user-created templates | ⬜ Pending |
| 6 — Hardening | Rate limiting, security headers, CI, production deploy | ⬜ Pending |

### Post-v1 backlog

| Idea | Value |
|------|-------|
| Team workspaces + shared template libraries | Collaboration |
| Prompt versioning + diff view | Power users |
| Inline "test run" against the model | Faster iteration |
| Prompt performance analytics | Insight |
| SSO (Google / GitHub / Microsoft) | Enterprise onboarding |
| Billing + usage tiers | Monetization |
| Browser extension / REST API | Distribution |
| Multi-model comparison | Flexibility |
| Redis cache + rate-limit store | Performance |
| RS256 JWT + key rotation for multi-service | Scale / security |

---

## 9. Constraints

- Database is **MSSQL** (SQL Server Express locally, Azure SQL in production).
- Auth is **JWT-based** — no third-party SSO in v1.
- AI calls use **Anthropic Claude API** (`claude-sonnet-4-6`).
- Single-region v1; stateless API design does not block multi-region later.
- No real-time collaboration, billing, or mobile native apps in v1.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| Access token | Short-lived JWT (30 min) sent on every API call via Bearer header |
| Refresh token | Long-lived random token (7 days) in HttpOnly cookie, stored as SHA-256 hash in DB |
| Meta-prompt | A prompt that asks the LLM to write another, optimized prompt |
| Template | A parameterized prompt skeleton with `{{variable}}` placeholders |
| Token rotation | Issuing a new refresh token on every use and revoking the old one |
| Reuse detection | If a revoked refresh token is replayed, the entire user token chain is revoked |
