'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

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
    router.push('/auth/signup')
  }

  const handleSignIn = () => {
    router.push('/auth/login')
  }

  return (
    <nav className="navbar navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary fs-3" href="#">
          ViralCraft
        </a>
        
        {/* Auth buttons - Always visible on mobile */}
        <div className="d-flex d-lg-none gap-2 me-3">
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={handleSignIn}
          >
            Log In
          </button>
          <button 
            className="btn btn-primary btn-sm px-3"
            onClick={handleSignUp}
          >
            Sign Up
          </button>
        </div>
        
        {/* Mobile menu toggle - Pure React controlled */}
        <button 
          className="navbar-toggler d-lg-none"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-controls="navbarNav"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Desktop navigation - Always visible on large screens */}
        <div className="d-none d-lg-flex align-items-center w-100">
          <ul className="navbar-nav me-auto mb-0">
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
          
          <div className="d-flex gap-2">
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

        {/* Mobile navigation menu - Pure React controlled */}
        {isMenuOpen && (
          <div className="d-lg-none position-absolute top-100 start-0 w-100 bg-white border-top shadow-sm" style={{zIndex: 1000}}>
            <div className="container py-3">
              <ul className="navbar-nav mb-0">
                <li className="nav-item mb-2">
                  <button 
                    className="nav-link btn btn-link text-decoration-none text-start w-100 py-2" 
                    onClick={() => {
                      smoothScrollTo('examples')
                      setIsMenuOpen(false)
                    }}
                  >
                    Examples
                  </button>
                </li>
                <li className="nav-item mb-2">
                  <button 
                    className="nav-link btn btn-link text-decoration-none text-start w-100 py-2" 
                    onClick={() => {
                      smoothScrollTo('features')
                      setIsMenuOpen(false)
                    }}
                  >
                    Features
                  </button>
                </li>
                <li className="nav-item mb-2">
                  <button 
                    className="nav-link btn btn-link text-decoration-none text-start w-100 py-2" 
                    onClick={() => {
                      smoothScrollTo('pricing')
                      setIsMenuOpen(false)
                    }}
                  >
                    Pricing
                  </button>
                </li>
                <li className="nav-item mb-2">
                  <button 
                    className="nav-link btn btn-link text-decoration-none text-start w-100 py-2" 
                    onClick={() => {
                      smoothScrollTo('testimonials')
                      setIsMenuOpen(false)
                    }}
                  >
                    Reviews
                  </button>
                </li>
                <li className="nav-item mb-2">
                  <button 
                    className="nav-link btn btn-link text-decoration-none text-start w-100 py-2" 
                    onClick={() => {
                      smoothScrollTo('faq')
                      setIsMenuOpen(false)
                    }}
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      
      {/* Click outside to close mobile menu */}
      {isMenuOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-lg-none" 
          style={{zIndex: 999}} 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      
    </nav>
  )
}