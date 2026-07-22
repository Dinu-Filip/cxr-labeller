import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../services/api'

interface AuthContextValue {
  isAuthenticated: boolean
  signUp: (username: string, email: string, password: string) => Promise<void>
  logIn: (username: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  const logIn = useCallback(async (username: string, password: string) => {
    const tokens = await authApi.logIn(username, password)
    setToken(tokens.access_token)
  }, [])

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      await authApi.signUp(username, email, password)
      await logIn(username, password)
    },
    [logIn],
  )

  const logOut = useCallback(async () => {
    if (token) {
      await authApi.logOut(token)
    }
    setToken(null)
  }, [token])

  const value = useMemo(
    () => ({ isAuthenticated: token !== null, signUp, logIn, logOut }),
    [token, signUp, logIn, logOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
