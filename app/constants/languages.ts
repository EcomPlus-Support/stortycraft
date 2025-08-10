import { Language } from '../types'

// Shared language constants for consistent language selection across the app
export const SUPPORTED_LANGUAGES: Language[] = [
  { name: "繁體中文", code: "zh-TW" },
  { name: "简体中文", code: "zh-CN" },
  { name: "English", code: "en-US" }
]

// Default language - Traditional Chinese as specified in requirements
export const DEFAULT_LANGUAGE: Language = {
  name: "繁體中文",
  code: "zh-TW"
}