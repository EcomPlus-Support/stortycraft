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
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary fs-3" href="#">
          ViralCraft
        </a>
        
        {/* Mobile menu toggle */}
        <button 
          className="navbar-toggler"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-controls="navbarNav"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Main navigation - Always visible on desktop, collapsible on mobile */}
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none border-0 bg-transparent p-2" 
                onClick={() => {
                  smoothScrollTo('features')
                  setIsMenuOpen(false)
                }}
              >
                Features
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none border-0 bg-transparent p-2" 
                onClick={() => {
                  smoothScrollTo('examples')
                  setIsMenuOpen(false)
                }}
              >
                Examples
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none border-0 bg-transparent p-2" 
                onClick={() => {
                  smoothScrollTo('pricing')
                  setIsMenuOpen(false)
                }}
              >
                Pricing
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none border-0 bg-transparent p-2" 
                onClick={() => {
                  smoothScrollTo('testimonials')
                  setIsMenuOpen(false)
                }}
              >
                Reviews
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-decoration-none border-0 bg-transparent p-2" 
                onClick={() => {
                  smoothScrollTo('faq')
                  setIsMenuOpen(false)
                }}
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

      </div>
      
    </nav>
  )
}