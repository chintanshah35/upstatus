import { describe, it, expect } from 'vitest'
import { validateUrl, validateInterval, validateTimeout, validateStatus, normalizeUrl, isTTY } from '../src/utils'

describe('normalizeUrl', () => {
  it('returns url unchanged if protocol exists', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('prepends https if no protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
    expect(normalizeUrl('api.example.com/health')).toBe('https://api.example.com/health')
  })

  it('throws on truly invalid url', () => {
    expect(() => normalizeUrl('://missing-host')).toThrow()
  })
})

describe('validateUrl', () => {
  it('validates correct urls', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com')
    expect(validateUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('normalizes urls without protocol', () => {
    expect(validateUrl('example.com')).toBe('https://example.com')
  })

  it('throws on invalid urls', () => {
    expect(() => validateUrl('')).toThrow()
    expect(() => validateUrl('ftp://example.com')).toThrow(/Unsupported protocol/)
  })
})

describe('validateInterval', () => {
  it('accepts valid numbers', () => {
    expect(validateInterval(30)).toBe(30)
    expect(validateInterval(1)).toBe(1)
    expect(validateInterval(3600)).toBe(3600)
  })

  it('parses string intervals', () => {
    expect(validateInterval('60')).toBe(60)
    expect(validateInterval('1')).toBe(1)
  })

  it('rejects invalid intervals', () => {
    expect(() => validateInterval(0)).toThrow()
    expect(() => validateInterval(-1)).toThrow()
    expect(() => validateInterval('abc')).toThrow()
    expect(() => validateInterval(NaN)).toThrow()
  })
})

describe('validateTimeout', () => {
  it('accepts valid timeouts', () => {
    expect(validateTimeout(1000)).toBe(1000)
    expect(validateTimeout(1)).toBe(1)
  })

  it('rejects invalid timeouts', () => {
    expect(() => validateTimeout(0)).toThrow()
    expect(() => validateTimeout(-1)).toThrow()
  })
})

describe('validateStatus', () => {
  it('accepts valid status codes', () => {
    expect(validateStatus(200)).toBe(200)
    expect(validateStatus(404)).toBe(404)
    expect(validateStatus(500)).toBe(500)
  })

  it('accepts status code arrays', () => {
    expect(validateStatus([200, 201, 204])).toEqual([200, 201, 204])
  })

  it('rejects invalid status codes', () => {
    expect(() => validateStatus(99)).toThrow()
    expect(() => validateStatus(600)).toThrow()
    expect(() => validateStatus([200, 99])).toThrow()
  })
})

describe('isTTY', () => {
  it('returns boolean', () => {
    expect(typeof isTTY()).toBe('boolean')
  })
})

