'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { cn } from '@/lib/utils'
import { ASPECT_RATIOS } from '../constants/aspectRatios'
import { type AspectRatio } from '../types'

interface AspectRatioSelectorProps {
  selectedRatio?: AspectRatio
  onSelect: (ratio: AspectRatio) => void
  disabled?: boolean
  className?: string
  showPreview?: boolean
}

export function AspectRatioSelector({
  selectedRatio,
  onSelect,
  disabled = false,
  className,
  showPreview = true
}: AspectRatioSelectorProps) {
  const [hoveredRatio, setHoveredRatio] = useState<AspectRatio | null>(null)

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Select Aspect Ratio</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {ASPECT_RATIOS.map((ratio) => {
          const isSelected = selectedRatio?.id === ratio.id
          const isHovered = hoveredRatio?.id === ratio.id
          
          return (
            <Card
              key={ratio.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected && 'ring-2 ring-primary bg-primary/5',
                isHovered && !isSelected && 'ring-1 ring-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onSelect(ratio)}
              onMouseEnter={() => setHoveredRatio(ratio)}
              onMouseLeave={() => setHoveredRatio(null)}
            >
              <CardContent className="p-6 space-y-4">
                {/* Visual Preview */}
                {showPreview && (
                  <div className="flex justify-center">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded border">
                      <div 
                        className={cn(
                          ratio.cssClass,
                          'bg-gradient-to-br from-primary/20 to-primary/40 rounded',
                          'flex items-center justify-center text-2xl font-mono text-primary'
                        )}
                      >
                        {ratio.icon}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Label and Description */}
                <div className="text-center space-y-2">
                  <div className="font-semibold text-lg">{ratio.label}</div>
                  {ratio.description && (
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {ratio.description}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 inline-block">
                    {ratio.width}:{ratio.height}
                  </div>
                </div>

                {/* Selection Indicator */}
                <div className="flex justify-center">
                  <div 
                    className={cn(
                      'w-3 h-3 rounded-full transition-colors',
                      isSelected ? 'bg-primary' : 'bg-gray-300'
                    )} 
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {selectedRatio && (
        <div className="text-sm text-muted-foreground text-center">
          Selected: {selectedRatio.label} ({selectedRatio.width}:{selectedRatio.height})
        </div>
      )}
    </div>
  )
}