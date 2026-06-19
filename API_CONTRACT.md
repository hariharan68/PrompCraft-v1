# PromptCraft — API Contract

The frontend is **fully built** against this contract. Implement these endpoints on
the backend and the UI connects with **zero frontend changes**.

## Conventions
- Base path: **`/api`**. All JSON. All field names **snake_case**.
- Timestamps: UTC, ISO-8601 (e.g. `2026-06-19T10:30:00Z`).
- Auth: send the access token as `Authorization: Bearer <token>` (frontend does this
  automatically). 🔒 = requires a valid access token.
- Errors: `{ "detail": "message" }` for 400/401/403/404/409, or the FastAPI 422
  validation array `[{ "loc": [...], "msg": "...", "type": "..." }]`. The frontend's
  `extractError()` already renders both shapes.
- CORS (already set in `app/main.py`): `allow_origins=["http://localhost:5173"]`,
  `allow_credentials=True`. Keep the origin explicit (not `*`) — required for cookies.

---

## Auth  (`/api/auth`)

### POST `/api/auth/register`
Request:
```json
{ "email": "you@example.com", "password": "secret123", "full_name": "Ada Lovelace" }
```
- `201` → the created user (see User shape). `409` if email taken. `422` weak password.

### POST `/api/auth/login`
**Content-Type: `application/x-www-form-urlencoded`** (OAuth2 password flow), fields
`username` (the email) and `password`.
- `200`:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": 1800 }
```
  plus `Set-Cookie: refresh_token=<...>; HttpOnly; SameSite=Strict; Path=/api/auth`
- `401` bad credentials.

### POST `/api/auth/refresh`
- Reads the refresh cookie (no body). Rotates the token.
- `200` → new `{ access_token, token_type, expires_in }` + new refresh cookie.
- `401` if missing/expired/revoked/reused (reuse revokes the whole chain).

### POST `/api/auth/logout`  🔒
- `204`. Revoke the refresh token + clear the cookie.

### GET `/api/auth/me`  🔒
- `200` → User.

**User shape**
```json
{ "id": 1, "email": "you@example.com", "full_name": "Ada Lovelace",
  "is_active": true, "created_at": "2026-06-19T10:30:00Z" }
```

---

## Templates  (`/api/templates`)  🔒

### GET `/api/templates?domain=coding`
- `200` → array of Template (domain filter optional).

### GET `/api/templates/{id}` → `200` Template

### POST `/api/templates/{id}/render`
Request: `{ "variables": { "language": "Python", "code": "..." } }`
- `200` → `{ "content": "<assembled prompt with {{vars}} substituted>" }`
- Server-side substitution + validation. **No AI.** `422` if a required variable is missing.

**Template shape**
```json
{ "id": 1, "name": "Refactor + Tests", "domain": "coding",
  "body": "You are an expert {{language}} engineer...",
  "variables": [
    { "name": "language", "label": "Programming language", "type": "text", "required": true }
  ],
  "is_system": true, "created_by": null }
```
> `variables` may be a parsed array OR a `variables_json` string — the frontend handles both.
> `type` is one of `text` | `textarea` | `number`.

---

## AI  (`/api/ai`)  🔒

### POST `/api/ai/generate`
Request:
```json
{ "goal": "summarize a research paper", "domain": "Data",
  "tone": "Professional", "output_format": "Bulleted list" }
```
- `200` → `{ "generated_prompt": "<optimized prompt>", "model": "claude-sonnet-4-6", "tokens_used": 412 }`
- `429` rate limited. `502` Claude unavailable/timeout.

---

## Prompts  (`/api/prompts`)  🔒  (ownership enforced — users only see their own)

### GET `/api/prompts?limit=20&offset=0&favorite=true&domain=coding`
- `200`:
```json
{ "items": [ /* Prompt[] */ ], "limit": 20, "offset": 0, "total": 42 }
```
- `limit` max 100. `favorite` and `domain` optional filters.

### POST `/api/prompts`
Request:
```json
{ "content": "<prompt text>", "mode": "ai", "domain": "coding",
  "title": "My prompt", "template_id": null }
```
- `mode` ∈ `template` | `ai` | `library`. `201` → Prompt.

### GET `/api/prompts/{id}` → `200` Prompt (404 if not owner)
### PATCH `/api/prompts/{id}` → `{ "title": "...", "is_favorite": true }` → `200` Prompt
### DELETE `/api/prompts/{id}` → `204`

**Prompt shape**
```json
{ "id": 10, "title": "My prompt", "content": "...", "domain": "coding",
  "mode": "ai", "is_favorite": false, "template_id": null,
  "created_at": "2026-06-19T10:30:00Z", "updated_at": null }
```

---

## System
### GET `/api/health` → `{ "status": "ok", "db": "ok", "version": "0.1.0" }`  ✅ done

---

## Field name reference (frontend expects these exactly)
`access_token`, `token_type`, `expires_in`, `full_name`, `is_active`, `created_at`,
`updated_at`, `is_favorite`, `template_id`, `generated_prompt`, `tokens_used`,
`output_format`, `variables` (`name`/`label`/`type`/`required`).

## Build order (matches the frontend)
1. **Auth** → Login/Register start working.
2. **Templates** → Templates + Library pages.
3. **Prompts** → History + Save buttons.
4. **AI** → the Generate button.
