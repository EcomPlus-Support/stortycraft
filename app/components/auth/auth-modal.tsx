'use client'

import { useState, useRef } from 'react'
import { X, Upload, Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'signup'
  onModeChange: (mode: 'login' | 'signup') => void
}

interface FormData {
  email: string
  password: string
  username: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  password?: string
  username?: string
  confirmPassword?: string
  general?: string
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    // Signup specific validations
    if (mode === 'signup') {
      if (!formData.username) {
        newErrors.username = 'Username is required'
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters long'
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simulate successful authentication
      console.log('Authentication successful:', { mode, formData })
      
      // Redirect to main app
      window.location.href = '/'
      
    } catch (error) {
      setErrors({ general: 'Authentication failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'wechat') => {
    setIsLoading(true)
    try {
      // Simulate social authentication
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`${provider} authentication successful`)
      
      // Redirect to main app
      window.location.href = '/'
      
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

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">
              {mode === 'login' ? 'Welcome Back!' : 'Join ViralCraft'}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              disabled={isLoading}
            ></button>
          </div>
          
          <div className="modal-body">
            {/* Mode Toggle Tabs */}
            <div className="d-flex mb-4">
              <button
                type="button"
                className={`btn flex-fill me-2 ${mode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => onModeChange('login')}
                disabled={isLoading}
              >
                Log In
              </button>
              <button
                type="button"
                className={`btn flex-fill ${mode === 'signup' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => onModeChange('signup')}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </div>

            {mode === 'signup' && (
              <div className="alert alert-info d-flex align-items-center mb-4">
                <div className="me-2">🎉</div>
                <div>
                  <strong>Get 50 free credits</strong> when you sign up today!
                </div>
              </div>
            )}

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
                    Google
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
                    Facebook
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
                    WeChat
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <span className="text-muted">or continue with email</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Profile Picture Upload - Only for Signup */}
              {mode === 'signup' && (
                <div className="mb-3 text-center">
                  <div className="position-relative d-inline-block">
                    <div 
                      className="rounded-circle bg-light d-flex align-items-center justify-content-center profile-upload"
                      style={{ width: '80px', height: '80px' }}
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
                    />
                  </div>
                </div>
              )}

              {/* Username - Only for Signup */}
              {mode === 'signup' && (
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    id="username"
                    className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Choose a username"
                    disabled={isLoading}
                  />
                  {errors.username && (
                    <div className="invalid-feedback">{errors.username}</div>
                  )}
                </div>
              )}

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
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>
              </div>

              {/* Confirm Password - Only for Signup */}
              {mode === 'signup' && (
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
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {errors.confirmPassword && (
                      <div className="invalid-feedback">{errors.confirmPassword}</div>
                    )}
                  </div>
                </div>
              )}

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
                    {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="text-center">
              {mode === 'login' ? (
                <div>
                  <button 
                    type="button" 
                    className="btn btn-link text-decoration-none p-0 me-3"
                    onClick={() => console.log('Forgot password')}
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                  <span className="text-muted">
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      className="btn btn-link text-decoration-none p-0"
                      onClick={() => onModeChange('signup')}
                      disabled={isLoading}
                    >
                      Sign Up
                    </button>
                  </span>
                </div>
              ) : (
                <span className="text-muted">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="btn btn-link text-decoration-none p-0"
                    onClick={() => onModeChange('login')}
                    disabled={isLoading}
                  >
                    Log In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}