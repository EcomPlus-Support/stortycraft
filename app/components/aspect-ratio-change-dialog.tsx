'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from 'lucide-react'
import { type AspectRatio } from '../types'

interface AspectRatioChangeDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentRatio?: AspectRatio
  newRatio: AspectRatio
  hasExistingContent: boolean
  isLoading?: boolean
}

export function AspectRatioChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  currentRatio,
  newRatio,
  hasExistingContent,
  isLoading = false
}: AspectRatioChangeDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Change Aspect Ratio</DialogTitle>
          </div>
          <DialogDescription className="space-y-2">
            <p>
              You are changing from{' '}
              <strong className="text-foreground">
                {currentRatio?.label || 'default'} ({currentRatio?.id || '16:9'})
              </strong>{' '}
              to{' '}
              <strong className="text-foreground">
                {newRatio.label} ({newRatio.id})
              </strong>
            </p>
            
            {hasExistingContent && (
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Warning:</strong> Changing the aspect ratio will affect how your existing content is displayed.
                  Images and videos may be cropped or letterboxed to fit the new dimensions.
                </p>
              </div>
            )}
            
            <div className="flex justify-between text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <div>
                <div className="font-medium">From:</div>
                <div>{currentRatio?.icon} {currentRatio?.description || 'Standard format'}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">To:</div>
                <div>{newRatio.icon} {newRatio.description}</div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Changing...
              </>
            ) : (
              'Change Aspect Ratio'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}