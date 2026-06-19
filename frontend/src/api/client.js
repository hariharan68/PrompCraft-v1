import axios from 'axios'

// ---------------------------------------------------------------------------
// Central Axios client with JWT handling.
//
// - Access token lives in memory (mirrored to localStorage so a page refresh
//   keeps you logged in). It is attached as `Authorization: Bearer <token>`.
// - The refresh token is an HttpOnly cookie the JS never reads; `withCredentials`
//   lets the browser send/receive it.
// - On a 401 we transparently call POST /api/auth/refresh ONCE, store the new
//   access token, and retry the original request. If refresh fails we clear the
//   session and notify the app (AuthContext) to bounce the user to /login.
// ---------------------------------------------------------------------------

const BASE = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN_KEY = 'pc_access_token'

let accessToken = null
let onAuthFailure = null // registered by AuthContext

export function setAccessToken(token) {
  accessToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getAccessToken() {
  if (accessToken) return accessToken
  accessToken = localStorage.getItem(TOKEN_KEY)
  return accessToken
}

export function setAuthFailureHandler(fn) {
  onAuthFailure = fn
}

const apiClient = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the access token to every request.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Silent refresh on 401. A single in-flight refresh is shared by concurrent 401s.
let refreshing = null

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const url = original?.url || ''

    const isAuthCall =
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register')

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios.post(`${BASE}/api/auth/refresh`, {}, { withCredentials: true })
        const { data } = await refreshing
        refreshing = null
        setAccessToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(original)
      } catch (refreshErr) {
        refreshing = null
        setAccessToken(null)
        if (onAuthFailure) onAuthFailure()
        return Promise.reject(refreshErr)
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
