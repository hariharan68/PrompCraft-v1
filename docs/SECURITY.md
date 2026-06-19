# PromptCraft — Security

---

## 1. Auth architecture — two-token model

| Token | Lifetime | Stored (frontend) | Sent how | Stored (backend) |
|-------|----------|-------------------|----------|------------------|
| **Access** | 30 min | Memory / localStorage | `Authorization: Bearer` header | Not stored |
| **Refresh** | 7 days | **HttpOnly Secure cookie** | Auto on `/api/auth/refresh` | SHA-256 hash in `RefreshTokens` table |

**Why two tokens?**
- Short access token → small blast radius if leaked (expires in 30 min).
- Long refresh token → user stays logged in without re-entering credentials.
- Refresh in **HttpOnly cookie** → JavaScript cannot read it (XSS protection).
- Refresh **hashed in DB** → a DB dump yields no usable tokens.
- Server-side record → tokens can be **revoked** (logout, rotation, theft) — the one
  thing pure stateless JWT cannot do.

---

## 2. Password handling

```
Registration:  plaintext ─── bcrypt(cost=12) ──▶ PasswordHash stored in DB
Login:         bcrypt.verify(plaintext, PasswordHash) → true/false
```

- Algorithm: **bcrypt** via `passlib[bcrypt]`, work factor **12**.
- `bcrypt` pinned to `==4.0.1` — passlib 1.7.4 is incompatible with bcrypt ≥ 4.1.
- Plaintext passwords are **never** stored or logged.
- Same error message returned for "email not found" and "wrong password" — prevents
  user enumeration.

---

## 3. JWT structure

**Header:** `{ "alg": "HS256", "typ": "JWT" }`

**Access token payload:**
```json
{ "sub": "1", "type": "access", "exp": 1750245000 }
```

**Refresh token:** not a JWT — a `secrets.token_urlsafe(48)` random string. Its
SHA-256 hash is stored in `RefreshTokens.TokenHash`. The raw token travels only as
an HttpOnly cookie and in the `Set-Cookie` header; it is never in the response body.

- `type` claim in access token prevents a refresh token being used as an access token.
- `JWT_SECRET` is HS256 symmetric. For multi-service setups, upgrade path is RS256.

---

## 4. Full auth flow

### Login
```
Client  ── POST /api/auth/login (form: username, password) ──▶ API
API:    verify_password(plaintext, PasswordHash)            ✔
API:    access = create_access_token(user.id)
API:    raw_refresh = secrets.token_urlsafe(48)
API:    INSERT RefreshTokens(SHA256(raw_refresh), expires_at, user_id)
API  ── 200 { access_token }                               ──▶ Client
API  ── Set-Cookie: refresh_token=<raw>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth
Client: store access token in memory
```

### Protected request
```
Client  ── GET /api/prompts  Authorization: Bearer <access> ──▶ API
API:    decode JWT → check type=="access", not expired
API:    load User by sub; check is_active
API  ── 200 [prompts] ──▶ Client
```

### Silent refresh (access token expired)
```
Client  ── GET /api/prompts (expired access) ──▶ API ── 401 ──▶ Client
Client  ── POST /api/auth/refresh (cookie auto-sent) ──▶ API
API:    look up RefreshTokens WHERE TokenHash = SHA256(cookie)
        → exists? not revoked? not expired?           ── else 401
API:    ROTATE:
        UPDATE RefreshTokens SET Revoked=1, ReplacedByTokenHash=SHA256(new_raw)
        INSERT new RefreshTokens row
        access = create_access_token(user.id)
API  ── 200 { access_token } + new Set-Cookie ──▶ Client
Client: retry original request with new access token   ✔
```

### Logout
```
Client  ── POST /api/auth/logout (cookie) ──▶ API
API:    UPDATE RefreshTokens SET Revoked=1 WHERE TokenHash = SHA256(cookie)
API  ── 204 + Set-Cookie: refresh_token=; Max-Age=0 (clear) ──▶ Client
```

---

## 5. Refresh token rotation & reuse detection

Every refresh **rotates** the token: old revoked, new issued, `ReplacedByTokenHash` links
the chain for auditing.

**Theft detection:** if a request presents a token that is **already `Revoked=1`**, it
means either:
- A legitimate rotation already happened (attacker replayed the old token), or
- The new token was stolen and used first.

In either case: **revoke every refresh token for that user** (`UPDATE RefreshTokens SET Revoked=1 WHERE UserId=?`), forcing re-login on all sessions. This is the `revoke_all_user_tokens` path in `auth/service.py`.

---

## 6. Cookie & CORS configuration

```python
# router.py — set on login and refresh
response.set_cookie(
    key="refresh_token",
    value=raw_refresh,
    httponly=True,                          # JS cannot read
    secure=settings.ENV != "development",   # HTTPS only in prod
    samesite="strict",                      # CSRF defense
    path="/api/auth",                       # only sent to auth endpoints
    max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
)
```

```python
# main.py — CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],   # exact origin, never "*"
    allow_credentials=True,                      # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

In development, the Vite proxy (`/api` → `http://localhost:8000`) means the browser sees
the same origin — the cookie works without any CORS negotiation.

---

## 7. Input validation & SQL injection prevention

- **Pydantic v2** validates every request body, query param, and path param.
- `EmailStr` validates email format; password min length enforced at schema level.
- **SQLAlchemy parameterized queries** everywhere — never string-format SQL.
- Template rendering uses a strict `{{var}}` regex; unknown or missing variables return
  `422` before any substitution.
- `Mode` column has a DB `CHECK` constraint: `IN ('template','ai','library')`.

---

## 8. Authorization

- Every data-bearing endpoint requires `Depends(get_current_user)`.
- **Row-level ownership** enforced in all queries:
  `WHERE UserId = current_user.id` — a user can never read, update, or delete another
  user's prompt.
- `IsActive=False` users are rejected at the `get_current_user` dependency, before any
  service logic runs.

---

## 9. Threat model (STRIDE)

| Threat | Example | Mitigation |
|--------|---------|------------|
| Spoofing | Forged identity / token | Signed JWT (HS256) + bcrypt passwords + refresh in DB |
| Tampering | Modified token payload | Signature verification on every decode |
| Repudiation | "I didn't do that" | `CreatedAt`, `IpAddress`, `UserAgent` on every token row |
| Information disclosure | DB leak | bcrypt hashes + SHA-256 token hashes; no secrets in logs |
| Denial of service | Login / AI flooding | Rate limiting, request timeouts, connection pool caps |
| Elevation of privilege | Read another user's prompts | `UserId == current.Id` check on every query |

---

## 10. OWASP Top 10 (2021) mapping

| OWASP | PromptCraft mitigation |
|-------|------------------------|
| A01 Broken Access Control | Row-level ownership checks; `get_current_user` on all protected routes |
| A02 Cryptographic Failures | bcrypt (cost 12) passwords, SHA-256 token hashes, HTTPS, secrets in vault |
| A03 Injection | SQLAlchemy parameterized queries; Pydantic input validation |
| A04 Insecure Design | Layered architecture; rotation + reuse detection; threat model |
| A05 Security Misconfiguration | Locked CORS; security headers; no debug stack traces in prod |
| A06 Vulnerable Components | Pinned deps; `pip-audit` + `npm audit` in CI |
| A07 Auth Failures | Strong password policy; rate limiting on login; short token lifetimes; lockout |
| A08 Integrity Failures | Signed JWTs; CI builds from pinned, reviewed deps |
| A09 Logging Failures | Structured JSON logs; auth-event logging; alerts on auth anomalies |
| A10 SSRF | No user-controlled outbound URLs; only fixed Anthropic API endpoint |

---

## 11. Rate limiting

| Endpoint | Suggested limit | Reason |
|----------|-----------------|--------|
| `POST /api/auth/login` | 5 / minute / IP | Brute-force defense |
| `POST /api/auth/register` | 3 / minute / IP | Spam account prevention |
| `POST /api/ai/generate` | 20 / hour / user | Cost control + Anthropic upstream limits |

Implement with `slowapi` (FastAPI) or at the reverse proxy / API gateway level.
Add exponential backoff + temporary IP lockout after repeated login failures.

---

## 12. Security headers (production)

Add via FastAPI middleware or Nginx:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.anthropic.com
```

---

## 13. Secrets management

- `JWT_SECRET`, DB password, `ANTHROPIC_API_KEY` come from environment variables or a
  secret manager (e.g. Azure Key Vault, AWS Secrets Manager) — **never committed to git**.
- `.env` is in `.gitignore`; only `.env.example` (no real values) is committed.
- Rotating `JWT_SECRET` invalidates all live access tokens immediately (useful for
  emergency revocation). Refresh tokens become invalid on next use (decode fails).

---

## 14. AI-specific safety

- The meta-prompt service sends only the user's goal + parameters to Claude — never
  another user's data.
- `max_tokens` cap and a request timeout prevent runaway cost and latency.
- Claude output is treated as **untrusted text**: rendered in React via JSX (escaped by
  default), never via `dangerouslySetInnerHTML`.
- Per-user rate limit on `/api/ai/generate` prevents abuse.

---

## 15. Pre-launch security checklist

- [ ] All secrets out of source control and in a secret manager
- [ ] HTTPS enforced; HSTS + security headers configured
- [ ] `secure=True`, `httpOnly=True`, `SameSite=Strict` on refresh cookie in production
- [ ] CORS restricted to production domain (`FRONTEND_ORIGIN=https://yourdomain.com`)
- [ ] Rate limiting on `/api/auth/login` and `/api/ai/generate`
- [ ] `pip-audit` and `npm audit` passing with no high/critical findings
- [ ] No verbose stack traces or internal paths exposed to clients in production
- [ ] Nightly purge job: `DELETE FROM RefreshTokens WHERE ExpiresAt < SYSUTCDATETIME() OR Revoked = 1`
- [ ] Auth-event alerts wired (login failures, refresh reuse, 5xx spikes)
- [ ] Auth flow review / penetration test completed
- [ ] `ENV=production` set; debug mode off
