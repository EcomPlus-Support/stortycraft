'use client'

import { useState } from 'react'

export function Footer() {
  const [language, setLanguage] = useState('en')

  const companyLinks = [
    { label: "About ViralCraft", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press Kit", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Blog", href: "#" }
  ]

  const productLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "API Documentation", href: "#" },
    { label: "System Status", href: "#" },
    { label: "Changelog", href: "#" }
  ]

  const resourceLinks = [
    { label: "Viral Content Guide", href: "#" },
    { label: "Creator Academy", href: "#" },
    { label: "Case Studies", href: "#" },
    { label: "Community Forum", href: "#" },
    { label: "Help Center", href: "#" }
  ]

  const legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "GDPR Compliance", href: "#" }
  ]

  const socialLinks = [
    { platform: "YouTube", icon: "📺", href: "#" },
    { platform: "TikTok", icon: "🎵", href: "#" },
    { platform: "Instagram", icon: "📷", href: "#" },
    { platform: "Twitter", icon: "🐦", href: "#" },
    { platform: "LinkedIn", icon: "💼", href: "#" }
  ]

  return (
    <footer className="container-fluid bg-dark text-light py-5">
      <div className="container">
        <div className="row g-4">
          {/* Company Column */}
          <div className="col-md-3">
            <h5 className="fw-bold mb-3 text-white">Company</h5>
            <ul className="list-unstyled">
              {companyLinks.map((link, index) => (
                <li key={index} className="mb-2">
                  <a href={link.href} className="text-light text-decoration-none">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product Column */}
          <div className="col-md-3">
            <h5 className="fw-bold mb-3 text-white">Product</h5>
            <ul className="list-unstyled">
              {productLinks.map((link, index) => (
                <li key={index} className="mb-2">
                  <a href={link.href} className="text-light text-decoration-none">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div className="col-md-3">
            <h5 className="fw-bold mb-3 text-white">Resources</h5>
            <ul className="list-unstyled">
              {resourceLinks.map((link, index) => (
                <li key={index} className="mb-2">
                  <a href={link.href} className="text-light text-decoration-none">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Social Column */}
          <div className="col-md-3">
            <h5 className="fw-bold mb-3 text-white">Legal & Social</h5>
            <ul className="list-unstyled mb-4">
              {legalLinks.map((link, index) => (
                <li key={index} className="mb-2">
                  <a href={link.href} className="text-light text-decoration-none">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Social Media Links */}
            <h6 className="fw-bold mb-3 text-white">Follow Us</h6>
            <div className="d-flex flex-wrap gap-2 mb-4">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href} 
                  className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
                  title={social.platform}
                >
                  <span>{social.icon}</span>
                  <span className="small">{social.platform}</span>
                </a>
              ))}
            </div>

            {/* Language Selector */}
            <div className="mb-3">
              <label className="form-label small text-white">Language</label>
              <select 
                className="form-select form-select-sm bg-secondary text-white border-secondary"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="zh">繁體中文</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="my-4 border-secondary" />

        {/* Bottom Footer */}
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <span className="fw-bold text-primary fs-4 me-3">ViralCraft</span>
              <span className="text-muted">From Inspiration to Viral in Minutes</span>
            </div>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="text-muted mb-0">
              © 2025 ViralCraft. All rights reserved.
            </p>
          </div>
        </div>

        {/* Additional Trust Indicators */}
        <div className="row mt-4">
          <div className="col-12 text-center">
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <span className="badge bg-success">🔒 SSL Secured</span>
              <span className="badge bg-info">🛡️ GDPR Compliant</span>
              <span className="badge bg-warning text-dark">⭐ 4.9/5 Rating</span>
              <span className="badge bg-primary">🏆 Industry Leader</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}