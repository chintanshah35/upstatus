import { describe, it, expect } from 'vitest'
import { exportToJson, exportToCsv } from '../src/export'
import type { MonitorStats } from '../src/types'

const mockStats: MonitorStats[] = [
  {
    url: 'https://example.com',
    name: 'example.com',
    checks: 10,
    uptime: 99.5,
    avgResponseTime: 150,
    lastCheck: {
      url: 'https://example.com',
      name: 'example.com',
      status: 'up',
      statusCode: 200,
      responseTime: 120,
      timestamp: new Date('2026-01-07T12:00:00Z'),
    },
    history: [],
  },
]

describe('exportToJson', () => {
  it('exports stats as formatted json', () => {
    const result = exportToJson(mockStats)
    const parsed = JSON.parse(result)
    
    expect(parsed).toHaveLength(1)
    expect(parsed[0].url).toBe('https://example.com')
    expect(parsed[0].uptime).toBe(99.5)
  })

  it('handles empty stats array', () => {
    const result = exportToJson([])
    expect(JSON.parse(result)).toEqual([])
  })
})

describe('exportToCsv', () => {
  it('exports stats as csv with headers', () => {
    const result = exportToCsv(mockStats)
    const lines = result.split('\n')
    
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('URL')
    expect(lines[0]).toContain('Uptime')
    expect(lines[1]).toContain('example.com')
  })

  it('escapes quotes in values', () => {
    const statsWithQuotes: MonitorStats[] = [{
      url: 'https://example.com/path?query="test"',
      name: 'test',
      checks: 1,
      uptime: 100,
      avgResponseTime: 100,
      history: [],
    }]
    
    const result = exportToCsv(statsWithQuotes)
    expect(result).toContain('""test""')
  })

  it('handles missing lastCheck', () => {
    const statsNoLastCheck: MonitorStats[] = [{
      url: 'https://example.com',
      name: 'test',
      checks: 0,
      uptime: 100,
      avgResponseTime: 0,
      history: [],
    }]
    
    const result = exportToCsv(statsNoLastCheck)
    expect(result).toContain('N/A')
  })
})

