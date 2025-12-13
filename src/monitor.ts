import { logger, time, timeEnd, table, box } from 'logfx'
import type { MonitorConfig, CheckResult, MonitorStats, MonitorStatus } from './types'

const log = logger('upstatus')

export class Monitor {
  private config: Required<MonitorConfig>
  private stats: MonitorStats
  private intervalId?: ReturnType<typeof setInterval>
  private running = false

  constructor(config: MonitorConfig) {
    this.config = {
      url: config.url,
      name: config.name || new URL(config.url).hostname,
      interval: config.interval || 30,
      timeout: config.timeout || 10000,
      expectedStatus: config.expectedStatus || 200,
      headers: config.headers || {},
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

  async check(): Promise<CheckResult> {
    const timerLabel = `${this.config.url}-check`
    time(timerLabel)

    const startTime = performance.now()
    let result: CheckResult

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: this.config.headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseTime = Math.round(performance.now() - startTime)
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
    } catch (err) {
      const responseTime = Math.round(performance.now() - startTime)
      const error = err instanceof Error ? err.message : 'Unknown error'

      result = {
        url: this.config.url,
        name: this.config.name,
        status: 'down',
        responseTime,
        error,
        timestamp: new Date(),
      }

      log.error(`${this.config.name} is DOWN`, { error })
    }

    timeEnd(timerLabel)

    this.updateStats(result)
    return result
  }

  private getStatus(statusCode: number, responseTime: number): MonitorStatus {
    if (statusCode !== this.config.expectedStatus) return 'down'
    if (responseTime > 2000) return 'degraded'
    return 'up'
  }

  private updateStats(result: CheckResult) {
    this.stats.checks++
    this.stats.lastCheck = result
    this.stats.history.push(result)

    if (this.stats.history.length > 100) this.stats.history.shift()

    const upChecks = this.stats.history.filter((r) => r.status === 'up').length
    this.stats.uptime = Math.round((upChecks / this.stats.history.length) * 100 * 10) / 10

    const totalTime = this.stats.history.reduce((sum, r) => sum + r.responseTime, 0)
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
    if (this.intervalId) {
      clearInterval(this.intervalId)
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
  private monitors: Map<string, Monitor> = new Map()
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
    const stats = Array.from(this.monitors.values()).map((m) => {
      const s = m.getStats()
      return {
        name: s.name,
        uptime: `${s.uptime}%`,
        avgTime: `${s.avgResponseTime}ms`,
        checks: s.checks,
        status: s.lastCheck?.status || 'pending',
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

