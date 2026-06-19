import apiClient from './client'

// POST /api/auth/register -> 201 { id, email, full_name, ... }
export async function registerApi({ email, password, full_name }) {
  const { data } = await apiClient.post('/api/auth/register', {
    email,
    password,
    full_name: full_name || null,
  })
  return data
}

// POST /api/auth/login  (x-www-form-urlencoded: username, password)
// -> 200 { access_token, token_type: "bearer", expires_in: 1800 }
//    + Set-Cookie refresh_token (HttpOnly)
export async function loginApi({ email, password }) {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)
  const { data } = await apiClient.post('/api/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

// POST /api/auth/refresh (refresh cookie only) -> 200 { access_token, ... }
export async function refreshApi() {
  const { data } = await apiClient.post('/api/auth/refresh', {})
  return data
}

// POST /api/auth/logout -> 204
export async function logoutApi() {
  await apiClient.post('/api/auth/logout', {})
}

// GET /api/auth/me -> 200 { id, email, full_name, is_active, created_at }
export async function meApi() {
  const { data } = await apiClient.get('/api/auth/me')
  return data
}
