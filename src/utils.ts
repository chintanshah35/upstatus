export interface ParsedArgs {
  urls: string[]
  interval: number
  degradedThreshold?: number
  version: boolean
  help: boolean
  noClear: boolean
  json: boolean
  export?: string
  output?: string
  method?: string
  body?: string
}

export function normalizeUrl(url: string): string {
  try {
    if (url.includes('://')) {
      new URL(url)
      return url
    }
    return `https://${url}`
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
}

export function validateUrl(url: string): string {
  try {
    const normalized = normalizeUrl(url)
    const urlObj = new URL(normalized)
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error(`Unsupported protocol: ${urlObj.protocol}. Only http:// and https:// are supported`)
    }
    
    return normalized
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid URL "${url}": ${error.message}`)
    }
    throw new Error(`Invalid URL: ${url}`)
  }
}

export function validateInterval(interval: number | string): number {
  const parsed = typeof interval === 'string' ? parseInt(interval, 10) : interval
  
  if (isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid interval: must be a positive number (got: ${interval})`)
  }
  
  return parsed
}

export function validateTimeout(timeout: number): number {
  if (timeout < 1) {
    throw new Error(`Invalid timeout: must be a positive number (got: ${timeout})`)
  }
  return timeout
}

export function validateStatus(status: number | number[]): number | number[] {
  if (Array.isArray(status)) {
    for (const code of status) {
      if (code < 100 || code > 599) {
        throw new Error(`Invalid status code: ${code} (must be 100-599)`)
      }
    }
    return status
  }
  
  if (status < 100 || status > 599) {
    throw new Error(`Invalid status code: ${status} (must be 100-599)`)
  }
  
  return status
}

export function isTTY(): boolean {
  return typeof process !== 'undefined' && 
         process.stdout !== undefined && 
         typeof process.stdout.isTTY === 'boolean' &&
         process.stdout.isTTY
}

