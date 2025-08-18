'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  socialLogin: (provider: 'google' | 'facebook' | 'wechat') => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'viralcraft_auth_token'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }
      
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        // Verify token with backend and get user data
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          // Token invalid, remove it
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY)
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.token)
          // Also set as cookie for SSR
          document.cookie = `viralcraft_auth_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        }
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      })

      const data = await response.json()

      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.token)
          // Also set as cookie for SSR
          document.cookie = `viralcraft_auth_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        }
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const socialLogin = async (provider: 'google' | 'facebook' | 'wechat'): Promise<{ success: boolean; error?: string }> => {
    try {
      // For now, simulate social login
      // In real implementation, this would redirect to OAuth provider
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate successful social auth
      const mockUser: AuthUser = {
        id: 'social_' + Date.now(),
        email: `user@${provider}.com`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        credits: 50,
        tier: 'FREE',
        image: `https://ui-avatars.com/api/?name=${provider}+User&background=primary&color=fff`
      }
      
      const mockToken = 'mock_social_token_' + Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, mockToken)
        // Also set as cookie for SSR
        document.cookie = `viralcraft_auth_token=${mockToken}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
      }
      setUser(mockUser)
      
      return { success: true }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      return { success: false, error: `${provider} authentication failed` }
    }
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      // Also remove cookie
      document.cookie = 'viralcraft_auth_token=; path=/; max-age=0'
    }
    setUser(null)
    router.push('/landing')
  }

  const refreshUser = async () => {
    try {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) return

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Token invalid, logout user
        logout()
      }
    } catch (error) {
      console.error('Refresh user error:', error)
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    socialLogin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}