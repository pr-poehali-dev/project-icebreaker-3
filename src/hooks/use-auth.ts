import { useEffect, useState } from 'react'

export interface AuthUser {
  id: number
  email: string
  username: string
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem('auth_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser())
  const [token, setToken] = useState<string | null>(getAuthToken())

  useEffect(() => {
    setUser(getAuthUser())
    setToken(getAuthToken())
  }, [])

  return { user, token, isAuthenticated: !!token }
}
