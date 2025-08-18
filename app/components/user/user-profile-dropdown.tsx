'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, User, Settings, CreditCard, History, Plus, LogOut, Link } from 'lucide-react'

interface UserProfileDropdownProps {
  user: {
    username: string
    email: string
    avatar?: string
    credits: number
  }
  onLogout: () => void
}

export function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuItemClick = (action: string) => {
    setIsOpen(false)
    
    switch (action) {
      case 'profile':
        console.log('Navigate to profile settings')
        break
      case 'linked-accounts':
        console.log('Navigate to linked accounts')
        break
      case 'billing':
        console.log('Navigate to billing history')
        break
      case 'add-credits':
        console.log('Navigate to add credits')
        break
      case 'logout':
        onLogout()
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        className="btn btn-link text-decoration-none d-flex align-items-center p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="me-2">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="rounded-circle"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '32px', height: '32px', fontSize: '12px' }}
            >
              {getInitials(user.username)}
            </div>
          )}
        </div>
        
        {/* Username and Credits */}
        <div className="text-start me-2 d-none d-md-block">
          <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
            {user.username}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {user.credits} credits
          </div>
        </div>
        
        {/* Chevron */}
        <ChevronDown 
          size={16} 
          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="dropdown-menu show position-absolute top-100 end-0 mt-1 shadow-lg border"
          style={{ minWidth: '250px', zIndex: 1050 }}
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-bottom bg-light">
            <div className="d-flex align-items-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="rounded-circle me-2"
                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold me-2"
                  style={{ width: '40px', height: '40px', fontSize: '14px' }}
                >
                  {getInitials(user.username)}
                </div>
              )}
              <div>
                <div className="fw-semibold">{user.username}</div>
                <div className="text-muted small">{user.email}</div>
              </div>
            </div>
          </div>

          {/* Credits Display */}
          <div className="px-3 py-2 border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">Available Credits</div>
                <div className="text-muted small">Use credits to generate content</div>
              </div>
              <div className="badge bg-primary fs-6">
                {user.credits}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              className="dropdown-item d-flex align-items-center py-2"
              onClick={() => handleMenuItemClick('profile')}
            >
              <Settings size={16} className="me-2 text-muted" />
              Profile Settings
            </button>
            
            <button
              className="dropdown-item d-flex align-items-center py-2"
              onClick={() => handleMenuItemClick('linked-accounts')}
            >
              <Link size={16} className="me-2 text-muted" />
              Linked Accounts
            </button>
            
            <button
              className="dropdown-item d-flex align-items-center py-2"
              onClick={() => handleMenuItemClick('billing')}
            >
              <History size={16} className="me-2 text-muted" />
              Billing History
            </button>
          </div>

          <div className="border-top py-1">
            <button
              className="dropdown-item d-flex align-items-center py-2 text-primary"
              onClick={() => handleMenuItemClick('add-credits')}
            >
              <Plus size={16} className="me-2" />
              Add Credits
            </button>
          </div>

          <div className="border-top py-1">
            <button
              className="dropdown-item d-flex align-items-center py-2 text-danger"
              onClick={() => handleMenuItemClick('logout')}
            >
              <LogOut size={16} className="me-2" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}