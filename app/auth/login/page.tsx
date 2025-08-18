'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

function LoginPageContent() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login, socialLogin, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnUrl)
    }
  }, [isAuthenticated, router, returnUrl])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        router.push(returnUrl)
      } else {
        setErrors({ general: result.error || 'Login failed. Please try again.' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'wechat') => {
    setIsLoading(true)
    setErrors({})
    
    try {
      const result = await socialLogin(provider)
      
      if (result.success) {
        router.push(returnUrl)
      } else {
        setErrors({ general: result.error || `${provider} authentication failed` })
      }
    } catch (error) {
      setErrors({ general: `${provider} authentication failed. Please try again.` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const getSocialButtonIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔍'
      case 'facebook':
        return '📘'
      case 'wechat':
        return '💬'
      default:
        return '🔗'
    }
  }

  if (isAuthenticated) {
    return null // Prevent flash of login form
  }

  return (
    <>
      <div className="text-center mb-4">
        <h3 className="fw-bold text-dark">Welcome Back!</h3>
        <p className="text-muted mb-0">Sign in to continue creating viral content</p>
      </div>

      {/* Social Authentication */}
      <div className="mb-4">
        <div className="row g-2">
          <div className="col-4">
            <button
              type="button"
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
            >
              <span className="me-1">{getSocialButtonIcon('google')}</span>
              <small>Google</small>
            </button>
          </div>
          <div className="col-4">
            <button
              type="button"
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
              onClick={() => handleSocialAuth('facebook')}
              disabled={isLoading}
            >
              <span className="me-1">{getSocialButtonIcon('facebook')}</span>
              <small>Facebook</small>
            </button>
          </div>
          <div className="col-4">
            <button
              type="button"
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
              onClick={() => handleSocialAuth('wechat')}
              disabled={isLoading}
            >
              <span className="me-1">{getSocialButtonIcon('wechat')}</span>
              <small>WeChat</small>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-muted">or continue with email</span>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email"
            id="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <div className="invalid-feedback">{errors.email}</div>
          )}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <div className="invalid-feedback d-block">{errors.password}</div>
          )}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="alert alert-danger mb-3">
            {errors.general}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-100 mb-3"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Footer Links */}
      <div className="text-center">
        <div className="mb-3">
          <button 
            type="button" 
            className="btn btn-link text-decoration-none p-0"
            onClick={() => console.log('Forgot password')}
            disabled={isLoading}
          >
            Forgot Password?
          </button>
        </div>
        <div className="text-muted">
          Don't have an account?{' '}
          <Link 
            href="/auth/signup" 
            className="text-decoration-none fw-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}