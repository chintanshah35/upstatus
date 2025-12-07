export type MonitorStatus = 'up' | 'down' | 'degraded'

export interface MonitorConfig {
  url: string
  name?: string
  interval?: number
  timeout?: number
  expectedStatus?: number
  headers?: Record<string, string>
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

