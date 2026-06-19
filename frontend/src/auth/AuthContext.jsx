import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import {
  setAccessToken,
  getAccessToken,
  setAuthFailureHandler,
} from '../api/client'
import { loginApi, registerApi, logoutApi, meApi, refreshApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while bootstrapping session

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  // When the Axios refresh ultimately fails, drop the session.
  useEffect(() => {
    setAuthFailureHandler(() => clearSession())
  }, [clearSession])

  // On first load, try to restore a session:
  //  - if we have an access token, validate it via /me
  //  - else try a silent refresh (the HttpOnly cookie may still be valid)
  useEffect(() => {
    let active = true
    async function bootstrap() {
      try {
        if (!getAccessToken()) {
          const data = await refreshApi()
          setAccessToken(data.access_token)
        }
        const me = await meApi()
        if (active) setUser(me)
      } catch {
        if (active) clearSession()
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [clearSession])

  const login = useCallback(async ({ email, password }) => {
    const data = await loginApi({ email, password })
    setAccessToken(data.access_token)
    const me = await meApi()
    setUser(me)
    return me
  }, [])

  const register = useCallback(
    async ({ email, password, full_name }) => {
      await registerApi({ email, password, full_name })
      return login({ email, password }) // auto-login after register
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // ignore network errors — we clear the session locally regardless
    }
    clearSession()
  }, [clearSession])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
