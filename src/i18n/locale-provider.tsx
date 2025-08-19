'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import enTranslations from './translations/en.json'
import arTranslations from './translations/ar.json'

type Locale = 'en' | 'ar'

interface LocaleContextType {
  locale: Locale
  isArabic: boolean
  t: (key: string) => string
  switchLanguage: () => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

const translations = {
  en: enTranslations,
  ar: arTranslations,
}

// Helper function to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path
}

interface LocaleProviderProps {
  children: ReactNode
  initialLocale: Locale
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  console.log('LocaleProvider initialized with locale:', initialLocale) // Debug log
  
  const t = (key: string): string => {
    const translation = getNestedValue(translations[initialLocale], key)
    console.log(`Translation for "${key}":`, translation) // Debug log
    return translation || key
  }

  const switchLanguage = () => {
    const currentHostname = window.location.hostname
    const currentPath = window.location.pathname
    const currentSearch = window.location.search
    
    if (initialLocale === 'en') {
      // Switch to Arabic
      const newHostname = currentHostname.startsWith('www.') 
        ? currentHostname.replace('www.', 'ar.')
        : `ar.${currentHostname}`
      window.location.href = `${window.location.protocol}//${newHostname}${currentPath}${currentSearch}`
    } else {
      // Switch to English
      const newHostname = currentHostname.replace('ar.', '')
      window.location.href = `${window.location.protocol}//${newHostname}${currentPath}${currentSearch}`
    }
  }

  return (
    <LocaleContext.Provider value={{
      locale: initialLocale,
      isArabic: initialLocale === 'ar',
      t,
      switchLanguage,
    }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}