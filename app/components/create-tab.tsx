'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StyleSelector, type Style } from "./style-selector"
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Language } from '../types'
import { type UserFriendlyError } from '@/lib/error-utils'
import { ErrorDisplay } from '@/components/ui/error-display'
import { SUPPORTED_LANGUAGES } from '../constants/languages'

// Using shared language constants for consistency

interface CreateTabProps {
  pitch: string
  setPitch: (pitch: string) => void
  numScenes: number
  setNumScenes: (num: number) => void
  style: string
  setStyle: (style: string) => void
  language: Language
  setLanguage: (language: Language) => void
  logoOverlay: string | null
  setLogoOverlay: (logo: string | null) => void
  isLoading: boolean
  errorMessage: UserFriendlyError | null
  onGenerate: () => Promise<void>
  styles: Style[]
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onLogoRemove: () => void
  useStructuredOutput: boolean
  setUseStructuredOutput: (use: boolean) => void
}

export function CreateTab({
  pitch,
  setPitch,
  numScenes,
  setNumScenes,
  style,
  setStyle,
  language,
  setLanguage,
  logoOverlay,
  setLogoOverlay,
  isLoading,
  errorMessage,
  onGenerate,
  styles,
  onLogoUpload,
  onLogoRemove,
  useStructuredOutput,
  setUseStructuredOutput
}: CreateTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Enter your story pitch</h2>
        <p className="text-muted-foreground">
          Describe your story idea and we&apos;ll generate a complete storyboard with scenes, descriptions, and voiceover text.
        </p>
      </div>
      <div className="space-y-4">
        <Textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Once upon a time..."
          className="min-h-[100px]"
          rows={4} />
        <div className="flex items-center space-x-2">
          <label htmlFor="language" className="text-sm font-medium">
            Language:
          </label>
          <Select 
            value={language.code} 
            onValueChange={(code) => {
              const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
              if (selectedLanguage) {
                setLanguage(selectedLanguage);
              }
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select language">
                {language.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Structured Output Toggle */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="structured-output" className="text-sm font-medium">
            增強精確度系統 (Enhanced Precision System):
          </Label>
          <Switch
            id="structured-output"
            checked={useStructuredOutput}
            onCheckedChange={setUseStructuredOutput}
            disabled={language.code !== 'zh-TW'}
          />
          <span className="text-xs text-muted-foreground">
            只限繁體中文
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="numScenes" className="text-sm font-medium">
            Number of Scenes:
          </label>
          <Input
            id="numScenes"
            type="number"
            min="1"
            max="20"
            value={numScenes}
            onChange={(e) => setNumScenes(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <div className="space-y-2">
          <StyleSelector styles={styles} onSelect={setStyle} />
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="style" className="text-sm font-medium">
            Style:
          </label>
          <Input
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-200"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="style" className="text-sm font-medium">
            Logo Overlay:
          </label>
          {logoOverlay ? (
            <div className="relative mx-auto w-full max-w-[100px] aspect-video overflow-hidden group">
              <Image
                src={logoOverlay || "/placeholder.svg"} 
                alt={`Logo Overlay`}
                className="w-full h-full object-contain rounded-t-lg"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                  target.onerror = null;
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogoRemove}
                  className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                >
                  Remove Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              <Button
                variant="secondary"
                size="icon"
                className="bg-black/50 hover:bg-green-500 hover:text-white"
                onClick={handleLogoClick}
              >
                <Upload className="h-4 w-4" />
                <span className="sr-only">Upload image</span>
              </Button>
              <input type="file" ref={fileInputRef} onChange={onLogoUpload} accept="image/*" className="hidden" />
            </div>
          )}
        </div>
        <Button 
          onClick={() => {
            console.log('Button clicked!');
            console.log('Current pitch:', pitch);
            console.log('Is loading:', isLoading);
            console.log('Pitch is empty:', pitch.trim() === '');
            onGenerate();
          }} 
          disabled={isLoading || pitch.trim() === ''}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Storyboard'
          )}
        </Button>
        {errorMessage && (
          <ErrorDisplay error={errorMessage} className="mt-4" />
        )}
      </div>
    </div>
  )
} 