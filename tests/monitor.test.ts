import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Monitor } from '../src/monitor'

describe('Monitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('creates monitor with default config', () => {
      const monitor = new Monitor({ url: 'https://example.com' })
      const stats = monitor.getStats()
      
      expect(stats.url).toBe('https://example.com')
      expect(stats.name).toBe('example.com')
      expect(stats.checks).toBe(0)
      expect(stats.uptime).toBe(100)
    })

    it('uses custom name when provided', () => {
      const monitor = new Monitor({ url: 'https://example.com', name: 'My API' })
      const stats = monitor.getStats()
      
      expect(stats.name).toBe('My API')
    })

    it('validates url', () => {
      expect(() => new Monitor({ url: 'not-a-url' })).toThrow()
    })

    it('normalizes url without protocol', () => {
      const monitor = new Monitor({ url: 'example.com' })
      const stats = monitor.getStats()
      
      expect(stats.url).toBe('https://example.com')
    })
  })

  describe('check', () => {
    it('returns up status for successful response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      })

      const monitor = new Monitor({ url: 'https://example.com' })
      const result = await monitor.check()

      expect(result.status).toBe('up')
      expect(result.statusCode).toBe(200)
    })

    it('returns down status for wrong status code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      })

      const monitor = new Monitor({ url: 'https://example.com' })
      const result = await monitor.check()

      expect(result.status).toBe('down')
      expect(result.statusCode).toBe(500)
    })

    it('returns down status on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const monitor = new Monitor({ url: 'https://example.com' })
      const result = await monitor.check()

      expect(result.status).toBe('down')
      expect(result.error).toBe('Network error')
    })

    it('updates stats after check', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      })

      const monitor = new Monitor({ url: 'https://example.com' })
      await monitor.check()
      const stats = monitor.getStats()

      expect(stats.checks).toBe(1)
      expect(stats.lastCheck).toBeDefined()
    })
  })

  describe('start/stop', () => {
    it('starts monitoring', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      })

      const monitor = new Monitor({ url: 'https://example.com', interval: 30 })
      monitor.start()

      expect(fetch).toHaveBeenCalledTimes(1)
      
      monitor.stop()
    })

    it('stops monitoring', () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      })

      const monitor = new Monitor({ url: 'https://example.com', interval: 1 })
      monitor.start()
      monitor.stop()

      const callCount = (fetch as any).mock.calls.length
      vi.advanceTimersByTime(5000)
      
      expect(fetch).toHaveBeenCalledTimes(callCount)
    })
  })

  describe('degraded status', () => {
    it('returns degraded for slow responses', async () => {
      const slowFetch = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ status: 200, ok: true })
          }, 100)
        })
      })
      global.fetch = slowFetch

      vi.useRealTimers()
      
      const monitor = new Monitor({ 
        url: 'https://example.com',
        degradedThreshold: 50,
      })
      
      const result = await monitor.check()
      expect(result.status).toBe('degraded')
    })
  })
})

