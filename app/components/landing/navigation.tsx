'use client'

import { useState } from 'react'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignUp = () => {
    console.log('Sign Up clicked')
  }

  const handleSignIn = () => {
    console.log('Sign In clicked')
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
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link" href="#examples">Examples</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#features">Features</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#pricing">Pricing</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#testimonials">Reviews</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#faq">FAQ</a>
            </li>
          </ul>
          
          <div className="d-flex flex-column flex-lg-row gap-2">
            <button 
              className="btn btn-link text-decoration-none"
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