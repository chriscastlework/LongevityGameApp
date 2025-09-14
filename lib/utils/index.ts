export * from './url-validation'

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Deep link utility functions
export function extractUtmParams(url: string): Record<string, string> {
  const urlObj = new URL(url)
  const utmParams: Record<string, string> = {}
  
  for (const [key, value] of urlObj.searchParams.entries()) {
    if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
      utmParams[key] = value
    }
  }
  
  return utmParams
}

export function buildTrackingUrl(
  baseUrl: string,
  source: string,
  campaign?: string,
  medium?: string
): string {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', source)
  if (campaign) url.searchParams.set('utm_campaign', campaign)
  if (medium) url.searchParams.set('utm_medium', medium)
  return url.toString()
}