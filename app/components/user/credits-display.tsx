'use client'

import { Plus } from 'lucide-react'

interface CreditsDisplayProps {
  credits: number
  onAddCredits?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showAddButton?: boolean
}

export function CreditsDisplay({ 
  credits, 
  onAddCredits, 
  className = '', 
  size = 'md',
  showAddButton = true 
}: CreditsDisplayProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          text: 'small',
          badge: 'fs-7',
          button: 'btn-sm'
        }
      case 'lg':
        return {
          container: 'px-4 py-3',
          text: 'fs-5',
          badge: 'fs-4',
          button: 'btn-lg'
        }
      default: // 'md'
        return {
          container: 'px-3 py-2',
          text: '',
          badge: 'fs-6',
          button: ''
        }
    }
  }

  const sizeClasses = getSizeClasses()

  const getCreditsColor = () => {
    if (credits <= 5) return 'bg-danger'
    if (credits <= 20) return 'bg-warning'
    return 'bg-success'
  }

  const getCreditsText = () => {
    if (credits === 0) return 'No credits remaining'
    if (credits === 1) return '1 credit remaining'
    return `${credits.toLocaleString()} credits remaining`
  }

  return (
    <div className={`d-flex align-items-center ${sizeClasses.container} ${className}`}>
      <div className="me-3">
        <div className={`fw-semibold ${sizeClasses.text}`}>
          Credits Available
        </div>
        <div className="text-muted small">
          {getCreditsText()}
        </div>
      </div>
      
      <div className="d-flex align-items-center gap-2">
        <span className={`badge ${getCreditsColor()} ${sizeClasses.badge}`}>
          {credits.toLocaleString()}
        </span>
        
        {showAddButton && onAddCredits && (
          <button
            type="button"
            className={`btn btn-outline-primary d-flex align-items-center ${sizeClasses.button}`}
            onClick={onAddCredits}
            title="Add more credits"
          >
            <Plus size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="me-1" />
            {size !== 'sm' && 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}

// Compact version for navigation bars
export function CompactCreditsDisplay({ credits, onAddCredits }: Pick<CreditsDisplayProps, 'credits' | 'onAddCredits'>) {
  const getCreditsColor = () => {
    if (credits <= 5) return 'text-danger'
    if (credits <= 20) return 'text-warning'
    return 'text-success'
  }

  return (
    <div className="d-flex align-items-center">
      <span className={`fw-semibold me-2 ${getCreditsColor()}`}>
        {credits}
      </span>
      <span className="text-muted small me-2">credits</span>
      {onAddCredits && (
        <button
          type="button"
          className="btn btn-link p-0 text-primary"
          onClick={onAddCredits}
          title="Add more credits"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}