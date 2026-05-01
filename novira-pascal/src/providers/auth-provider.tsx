'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authAPI } from '@/lib/novira-api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  plan: 'free' | 'advanced' | 'premium'
  aiCredits: number
  storageUsed: number
  storageLimit: number
  avatarUrl?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('novira_token')
    const storedUser = localStorage.getItem('novira_user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('novira_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const { token: newToken, user: newUser } = response

    localStorage.setItem('novira_token', newToken)
    localStorage.setItem('novira_user', JSON.stringify(newUser))

    setToken(newToken)
    setUser(newUser)
  }, [])

  const register = useCallback(async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => {
    const response = await authAPI.register(data)
    const { token: newToken, user: newUser } = response

    localStorage.setItem('novira_token', newToken)
    localStorage.setItem('novira_user', JSON.stringify(newUser))

    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('novira_token')
    localStorage.removeItem('novira_user')
    setToken(null)
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return

    try {
      const response = await authAPI.getProfile()
      setUser(response.user)
      localStorage.setItem('novira_user', JSON.stringify(response.user))
    } catch {
      // Token might be invalid
      logout()
    }
  }, [token, logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
