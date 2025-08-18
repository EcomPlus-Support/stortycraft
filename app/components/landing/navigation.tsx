'use client'

import { useState } from 'react'
import { AuthModal } from '../auth/auth-modal'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup')

  const smoothScrollTo = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  const handleSignUp = () => {
    setAuthModalMode('signup')
    setAuthModalOpen(true)
  }

  const handleSignIn = () => {
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary fs-3" href="#">
          ViralCraft
        </a>
        
        <button 
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-controls="navbarNav"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none" 
                onClick={() => smoothScrollTo('examples')}
              >
                Examples
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none" 
                onClick={() => smoothScrollTo('features')}
              >
                Features
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none" 
                onClick={() => smoothScrollTo('pricing')}
              >
                Pricing
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none" 
                onClick={() => smoothScrollTo('testimonials')}
              >
                Reviews
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none" 
                onClick={() => smoothScrollTo('faq')}
              >
                FAQ
              </button>
            </li>
          </ul>
          
          <div className="d-flex flex-column flex-lg-row gap-2">
            <button 
              className="btn btn-outline-secondary"
              onClick={handleSignIn}
            >
              Log In
            </button>
            <button 
              className="btn btn-primary px-4"
              onClick={handleSignUp}
            >
              Sign Up Free
            </button>
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
      />
    </nav>
  )
}