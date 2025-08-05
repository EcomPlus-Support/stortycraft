import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { type UserFriendlyError } from '@/lib/error-utils'

interface ErrorDisplayProps {
  error: UserFriendlyError
  onRetry?: () => void
  className?: string
}

export function ErrorDisplay({ error, onRetry, className = "" }: ErrorDisplayProps) {
  const colorClasses = {
    error: {
      alert: 'border-red-200 bg-red-50',
      icon: 'text-red-600',
      title: 'text-red-800',
      description: 'text-red-700',
      button: 'border-red-300 text-red-700 hover:bg-red-100'
    },
    warning: {
      alert: 'border-yellow-200 bg-yellow-50',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      description: 'text-yellow-700',
      button: 'border-yellow-300 text-yellow-700 hover:bg-yellow-100'
    },
    info: {
      alert: 'border-blue-200 bg-blue-50',
      icon: 'text-blue-600',
      title: 'text-blue-800',
      description: 'text-blue-700',
      button: 'border-blue-300 text-blue-700 hover:bg-blue-100'
    }
  }

  const colors = colorClasses[error.type]

  return (
    <Alert className={`border-2 ${colors.alert} ${className}`}>
      <AlertCircle className={`w-4 h-4 ${colors.icon}`} />
      <AlertTitle className={colors.title}>
        {error.title}
      </AlertTitle>
      <AlertDescription className={colors.description}>
        <div className="space-y-2">
          <p>{error.message}</p>
          {error.actionable && (
            <p className="font-medium">{error.actionable}</p>
          )}
        </div>
      </AlertDescription>
      {onRetry && (
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={onRetry}
            className={colors.button}
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </Alert>
  )
}