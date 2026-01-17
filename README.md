# upstatus

> Simple uptime monitoring CLI

[![npm version](https://img.shields.io/npm/v/upstatus.svg)](https://www.npmjs.com/package/upstatus)
[![npm downloads](https://img.shields.io/npm/dm/upstatus.svg)](https://www.npmjs.com/package/upstatus)
[![build](https://github.com/chintanshah35/upstatus/actions/workflows/test-suite.yml/badge.svg)](https://github.com/chintanshah35/upstatus/actions)
[![node](https://img.shields.io/node/v/upstatus.svg)](https://nodejs.org)
[![bundle size](https://img.shields.io/bundlephobia/minzip/upstatus)](https://bundlephobia.com/package/upstatus)
[![license](https://img.shields.io/npm/l/upstatus.svg)](https://github.com/chintanshah35/upstatus/blob/main/LICENSE)

## Install

```bash
npm install -g upstatus
```

## Quick Start

```bash
# Monitor a single URL
upstatus https://api.example.com

# Monitor multiple URLs
upstatus https://api.example.com https://site.com

# Custom interval (default 30s)
upstatus https://api.example.com -i 60

# Demo mode (no URLs)
npx upstatus
```

## Features

- Response time tracking
- Uptime percentage calculation
- Status detection (up/down/degraded)
- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Request body support
- Configurable thresholds
- Retry logic with exponential backoff
- JSON/CSV export
- CI/script friendly (JSON output mode)
- Pretty terminal output (powered by logfx)

## Usage

### Basic Monitoring

```bash
upstatus https://api.github.com https://httpstat.us/200
```

### Custom Interval

```bash
# Check every 60 seconds
upstatus https://api.example.com -i 60
```

### POST Requests

```bash
upstatus https://api.example.com/health -m POST -b '{"check":"deep"}'
```

### Degraded Threshold

Mark responses as "degraded" if they exceed a threshold:

```bash
# Mark as degraded if response > 1000ms (default: 2000ms)
upstatus https://api.example.com -d 1000
```

### Export Results

Export stats when you stop monitoring (Ctrl+C):

```bash
# Export to JSON
upstatus https://api.example.com --export json -o results.json

# Export to CSV
upstatus https://api.example.com --export csv -o results.csv
```

### JSON Output Mode

For CI/CD pipelines and scripts:

```bash
upstatus https://api.example.com --json
```

### Non-TTY Environments

Disable terminal clearing for logs/CI:

```bash
upstatus https://api.example.com --no-clear
```

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--interval` | `-i` | Check interval in seconds | 30 |
| `--degraded-threshold` | `-d` | Response time threshold (ms) for degraded status | 2000 |
| `--method` | `-m` | HTTP method (GET, POST, PUT, PATCH, DELETE) | GET |
| `--body` | `-b` | Request body for POST/PUT/PATCH | - |
| `--export` | - | Export format (json, csv) | - |
| `--output` | `-o` | Output file path | - |
| `--json` | - | JSON output mode | false |
| `--no-clear` | - | Disable terminal clearing | false |
| `--version` | `-v` | Show version | - |
| `--help` | `-h` | Show help | - |

## Programmatic Usage

```typescript
import { Monitor, MonitorManager } from 'upstatus'

const manager = new MonitorManager()

manager.add({
  url: 'https://api.example.com',
  interval: 30,
  timeout: 10000,
  expectedStatus: 200,
  degradedThreshold: 2000,
  maxRetries: 2,
  retryDelay: 1000,
})

manager.startAll()

// Get stats
const stats = manager.getMonitor('api.example.com')?.getStats()
console.log(stats)

// Stop all monitors
manager.stopAll()
```

### Monitor Configuration

```typescript
interface MonitorConfig {
  url: string
  name?: string
  interval?: number              // seconds (default: 30)
  timeout?: number               // ms (default: 10000)
  expectedStatus?: number | number[]  // (default: 200)
  headers?: Record<string, string>
  degradedThreshold?: number     // ms (default: 2000)
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: string
  contentType?: string           // (default: 'application/json')
  followRedirects?: boolean      // (default: true)
  maxRedirects?: number          // (default: 5)
  maxRetries?: number            // (default: 0)
  retryDelay?: number            // ms (default: 1000)
}
```

### Export Utilities

```typescript
import { exportToJson, exportToCsv } from 'upstatus'

const stats = manager.monitors.values().map(m => m.getStats())

const json = exportToJson(stats)
const csv = exportToCsv(stats)
```

## Status Types

| Status | Meaning |
|--------|---------|
| `up` | Response received with expected status code |
| `degraded` | Response received but slower than threshold |
| `down` | Request failed or unexpected status code |

## License

MIT
