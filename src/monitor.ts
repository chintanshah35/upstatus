import { logger, time, timeEnd, table, box } from 'logfx'
import type { MonitorConfig, CheckResult, MonitorStats, MonitorStatus, HttpMethod } from './types'
import { validateUrl, validateTimeout, validateStatus } from './utils'

const log = logger('upstatus')

export class Monitor {
  private config: Required<Omit<MonitorConfig, 'body'>> & { body?: string }
  private stats: MonitorStats
  private intervalId?: ReturnType<typeof setInterval>
  private running = false
  private abortController?: AbortController

  constructor(config: MonitorConfig) {
    const validatedUrl = validateUrl(config.url)
    
    let name: string
    try {
      name = config.name || new URL(validatedUrl).hostname
    } catch {
      name = validatedUrl
    }
    
    this.config = {
      url: validatedUrl,
      name,
      interval: config.interval || 30,
      timeout: validateTimeout(config.timeout || 10000),
      expectedStatus: validateStatus(config.expectedStatus || 200),
      headers: config.headers || {},
      degradedThreshold: config.degradedThreshold || 2000,
      method: config.method || 'GET',
      body: config.body,
      contentType: config.contentType || 'application/json',
      followRedirects: config.followRedirects !== false,
      maxRedirects: config.maxRedirects || 5,
      maxRetries: config.maxRetries || 0,
      retryDelay: config.retryDelay || 1000,
    }

    this.stats = {
      url: this.config.url,
      name: this.config.name,
      checks: 0,
      uptime: 100,
      avgResponseTime: 0,
      history: [],
    }
  }

  private async performCheck(): Promise<{ response: Response; responseTime: number }> {
    const startTime = performance.now()
    this.abortController = new AbortController()
    const timeoutId = setTimeout(() => this.abortController!.abort(), this.config.timeout)

    try {
      const headers: Record<string, string> = { ...this.config.headers }
      
      if (this.config.body && ['POST', 'PUT', 'PATCH'].includes(this.config.method)) {
        headers['Content-Type'] = this.config.contentType
      }
      
      const fetchOptions: RequestInit = {
        method: this.config.method,
        headers,
        signal: this.abortController.signal,
      }
      
      if (this.config.body && ['POST', 'PUT', 'PATCH'].includes(this.config.method)) {
        fetchOptions.body = this.config.body
      }
      
      if (!this.config.followRedirects) {
        fetchOptions.redirect = 'manual'
      }

      const response = await fetch(this.config.url, fetchOptions)
      clearTimeout(timeoutId)
      
      if (!this.config.followRedirects && response.status >= 300 && response.status < 400) {
        throw new Error(`Redirect detected (${response.status}) but followRedirects is false`)
      }

      const responseTime = Math.round(performance.now() - startTime)
      return { response, responseTime }
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  private isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('aborted') ||
      message.includes('fetch failed') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    )
  }

  async check(): Promise<CheckResult> {
    const timerLabel = `${this.config.url}-check`
    time(timerLabel)

    const overallStartTime = performance.now()
    let result: CheckResult
    let lastError: Error | null = null
    let attempts = 0
    const maxAttempts = this.config.maxRetries + 1

    while (attempts < maxAttempts) {
      attempts++
      
      try {
        const { response, responseTime } = await this.performCheck()
        const status = this.getStatus(response.status, responseTime)

        result = {
          url: this.config.url,
          name: this.config.name,
          status,
          statusCode: response.status,
          responseTime,
          timestamp: new Date(),
        }

        if (status === 'up') {
          log.success(`${this.config.name} is UP`, {
            status: response.status,
            time: `${responseTime}ms`,
            attempts: attempts > 1 ? ` (retry ${attempts - 1})` : '',
          })
        } else if (status === 'degraded') {
          log.warn(`${this.config.name} is SLOW`, {
            status: response.status,
            time: `${responseTime}ms`,
          })
        } else {
          log.error(`${this.config.name} is DOWN`, {
            status: response.status,
            expected: this.config.expectedStatus,
          })
        }

        timeEnd(timerLabel)
        this.updateStats(result)
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        
        if (attempts < maxAttempts && this.isTransientError(lastError)) {
          const delay = this.config.retryDelay * Math.pow(2, attempts - 1)
          log.warn(`${this.config.name} failed, retrying in ${delay}ms...`, {
            attempt: attempts,
            maxAttempts,
            error: lastError.message,
          })
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        break
      }
    }

    const responseTime = Math.round(performance.now() - overallStartTime)
    const error = lastError ? lastError.message : 'Unknown error'

    result = {
      url: this.config.url,
      name: this.config.name,
      status: 'down',
      responseTime,
      error,
      timestamp: new Date(),
    }

    log.error(`${this.config.name} is DOWN`, { 
      error,
      attempts: attempts > 1 ? ` (${attempts} attempts)` : '',
    })

    timeEnd(timerLabel)
    this.updateStats(result)
    return result
  }

  private getStatus(statusCode: number, responseTime: number): MonitorStatus {
    const expectedStatuses = Array.isArray(this.config.expectedStatus)
      ? this.config.expectedStatus
      : [this.config.expectedStatus]
    
    if (!expectedStatuses.includes(statusCode)) {
      return 'down'
    }
    
    if (responseTime > this.config.degradedThreshold) {
      return 'degraded'
    }
    
    return 'up'
  }

  private updateStats(result: CheckResult) {
    this.stats.checks++
    this.stats.lastCheck = result
    this.stats.history.push(result)

    if (this.stats.history.length > 100) this.stats.history.shift()

    const upChecks = this.stats.history.filter((check) => check.status === 'up').length
    this.stats.uptime = Math.round((upChecks / this.stats.history.length) * 100 * 10) / 10

    const totalTime = this.stats.history.reduce((sum, check) => sum + check.responseTime, 0)
    this.stats.avgResponseTime = Math.round(totalTime / this.stats.history.length)
  }

  start() {
    if (this.running) return

    this.running = true
    log.info(`Starting monitor for ${this.config.name}`, {
      url: this.config.url,
      interval: `${this.config.interval}s`,
    })

    this.check()
    this.intervalId = setInterval(() => this.check(), this.config.interval * 1000)
  }

  stop() {
    if (!this.running) return

    this.running = false
    
    if (this.abortController) {
      this.abortController.abort()
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    
    log.info(`Stopped monitor for ${this.config.name}`)
  }

  getStats(): MonitorStats {
    return { ...this.stats }
  }

  printStats() {
    const stats = this.getStats()

    box(`${stats.name} Statistics`, {
      title: '📊 Monitor Stats',
      borderColor: stats.uptime >= 99 ? 'green' : stats.uptime >= 95 ? 'yellow' : 'red',
    })

    table([
      { metric: 'URL', value: stats.url },
      { metric: 'Checks', value: stats.checks.toString() },
      { metric: 'Uptime', value: `${stats.uptime}%` },
      { metric: 'Avg Response', value: `${stats.avgResponseTime}ms` },
      { metric: 'Last Status', value: stats.lastCheck?.status || 'N/A' },
    ])
  }
}

export class MonitorManager {
  monitors: Map<string, Monitor> = new Map()
  private managerLog = logger('upstatus:manager')

  add(config: MonitorConfig): Monitor {
    const monitor = new Monitor(config)
    const key = config.name || config.url
    this.monitors.set(key, monitor)
    this.managerLog.info(`Added monitor: ${key}`)
    return monitor
  }

  remove(name: string) {
    const monitor = this.monitors.get(name)
    if (monitor) {
      monitor.stop()
      this.monitors.delete(name)
      this.managerLog.info(`Removed monitor: ${name}`)
    }
  }

  startAll() {
    this.managerLog.info(`Starting ${this.monitors.size} monitors`)
    box([
      'UpStatus starting',
      '',
      `Monitors: ${this.monitors.size}`,
      'Press Ctrl+C to stop',
    ], { borderColor: 'cyan' })

    for (const monitor of this.monitors.values()) {
      monitor.start()
    }
  }

  stopAll() {
    this.managerLog.info('Stopping all monitors')
    for (const monitor of this.monitors.values()) {
      monitor.stop()
    }
  }

  printAllStats() {
    const stats = Array.from(this.monitors.values()).map((monitor) => {
      const monitorStats = monitor.getStats()
      return {
        name: monitorStats.name,
        uptime: `${monitorStats.uptime}%`,
        avgTime: `${monitorStats.avgResponseTime}ms`,
        checks: monitorStats.checks,
        status: monitorStats.lastCheck?.status || 'pending',
      }
    })

    console.log('\n')
    table(stats)
  }

  getMonitor(name: string): Monitor | undefined {
    return this.monitors.get(name)
  }

  get size(): number {
    return this.monitors.size
  }
}
