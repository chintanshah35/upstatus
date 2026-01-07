import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MonitorManager } from '../src/monitor'

describe('MonitorManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('add', () => {
    it('adds monitor and returns it', () => {
      const manager = new MonitorManager()
      const monitor = manager.add({ url: 'https://example.com' })
      
      expect(monitor).toBeDefined()
      expect(manager.size).toBe(1)
    })

    it('uses url as key when no name provided', () => {
      const manager = new MonitorManager()
      manager.add({ url: 'https://example.com' })
      
      const retrieved = manager.getMonitor('https://example.com')
      expect(retrieved).toBeDefined()
    })

    it('uses name as key when provided', () => {
      const manager = new MonitorManager()
      manager.add({ url: 'https://example.com', name: 'My API' })
      
      const retrieved = manager.getMonitor('My API')
      expect(retrieved).toBeDefined()
    })
  })

  describe('remove', () => {
    it('removes and stops monitor', () => {
      const manager = new MonitorManager()
      manager.add({ url: 'https://example.com', name: 'test' })
      
      expect(manager.size).toBe(1)
      
      manager.remove('test')
      
      expect(manager.size).toBe(0)
      expect(manager.getMonitor('test')).toBeUndefined()
    })

    it('handles removing non-existent monitor', () => {
      const manager = new MonitorManager()
      
      expect(() => manager.remove('non-existent')).not.toThrow()
    })
  })

  describe('startAll/stopAll', () => {
    it('starts all monitors', () => {
      const manager = new MonitorManager()
      manager.add({ url: 'https://example1.com' })
      manager.add({ url: 'https://example2.com' })
      
      manager.startAll()
      
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('stops all monitors', () => {
      const manager = new MonitorManager()
      manager.add({ url: 'https://example1.com', interval: 1 })
      manager.add({ url: 'https://example2.com', interval: 1 })
      
      manager.startAll()
      manager.stopAll()
      
      const callCount = (fetch as any).mock.calls.length
      vi.advanceTimersByTime(5000)
      
      expect(fetch).toHaveBeenCalledTimes(callCount)
    })
  })

  describe('size', () => {
    it('returns correct count', () => {
      const manager = new MonitorManager()
      
      expect(manager.size).toBe(0)
      
      manager.add({ url: 'https://example1.com' })
      expect(manager.size).toBe(1)
      
      manager.add({ url: 'https://example2.com' })
      expect(manager.size).toBe(2)
    })
  })
})

