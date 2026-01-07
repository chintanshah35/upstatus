export type MonitorStatus = 'up' | 'down' | 'degraded'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MonitorConfig {
  url: string
  name?: string
  interval?: number
  timeout?: number
  expectedStatus?: number | number[]
  headers?: Record<string, string>
  degradedThreshold?: number
  method?: HttpMethod
  body?: string
  contentType?: string
  followRedirects?: boolean
  maxRedirects?: number
  maxRetries?: number
  retryDelay?: number
}

export interface CheckResult {
  url: string
  name: string
  status: MonitorStatus
  statusCode?: number
  responseTime: number
  error?: string
  timestamp: Date
}

export interface MonitorStats {
  url: string
  name: string
  checks: number
  uptime: number
  avgResponseTime: number
  lastCheck?: CheckResult
  history: CheckResult[]
}

