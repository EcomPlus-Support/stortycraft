'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Upload } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface FormData {
  email: string
  password: string
  name: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  password?: string
  name?: string
  confirmPassword?: string
  general?: string
}

function SignupPageContent() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, socialLogin, isAuthenticated } = useAuth()
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

    // Name validation
    if (!formData.name) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long'
    }

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      const result = await register(formData.email, formData.password, formData.name)
      
      if (result.success) {
        router.push(returnUrl)
      } else {
        setErrors({ general: result.error || 'Registration failed. Please try again.' })
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

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicture(reader.result as string)
      }
      reader.readAsDataURL(file)
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
    return null // Prevent flash of signup form
  }

  return (
    <>
      <div className="text-center mb-4">
        <h3 className="fw-bold text-dark">Join ViralCraft</h3>
        <p className="text-muted mb-0">Start creating viral content today</p>
      </div>

      {/* Free Credits Banner */}
      <div className="alert alert-info d-flex align-items-center mb-4">
        <div className="me-2">🎉</div>
        <div>
          <strong>Get 50 free credits</strong> when you sign up today!
        </div>
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

      {/* Signup Form */}
      <form onSubmit={handleSubmit}>
        {/* Profile Picture Upload */}
        <div className="mb-3 text-center">
          <div className="position-relative d-inline-block">
            <div 
              className="rounded-circle bg-light d-flex align-items-center justify-content-center profile-upload"
              style={{ width: '80px', height: '80px', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="rounded-circle w-100 h-100"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <Upload size={24} className="text-muted" />
              )}
            </div>
            <div className="small text-muted mt-1">Profile Picture (Optional)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="d-none"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Name */}
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Full Name</label>
          <input
            type="text"
            id="name"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            disabled={isLoading}
            autoComplete="name"
          />
          {errors.name && (
            <div className="invalid-feedback">{errors.name}</div>
          )}
        </div>

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
              placeholder="Create a password"
              disabled={isLoading}
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <div className="input-group">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="invalid-feedback d-block">{errors.confirmPassword}</div>
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
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Footer Links */}
      <div className="text-center">
        <div className="text-muted">
          Already have an account?{' '}
          <Link 
            href="/auth/login" 
            className="text-decoration-none fw-medium"
          >
            Log In
          </Link>
        </div>
      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  )
}