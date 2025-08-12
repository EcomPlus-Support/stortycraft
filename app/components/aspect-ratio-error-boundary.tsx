'use client'

import { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class AspectRatioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AspectRatio Error Boundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-lg">Aspect Ratio Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong with the aspect ratio display. This might be due to an invalid aspect ratio or a rendering issue.
            </p>
            
            {this.state.error && (
              <details className="text-xs text-left bg-muted p-3 rounded">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <code className="whitespace-pre-wrap">
                  {this.state.error.message}
                </code>
              </details>
            )}
            
            <Button 
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset View
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}