import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try { return JSON.parse(stored) } catch {}
    }
    return { user: null, token: null, isAuthenticated: false }
  })

  const login = useCallback((user, token) => {
    const next = { user, token, isAuthenticated: true }
    setState(next)
    localStorage.setItem('auth', JSON.stringify(next))
  }, [])

  const logout = useCallback(() => {
    const next = { user: null, token: null, isAuthenticated: false }
    setState(next)
    localStorage.removeItem('auth')
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
