import { log } from 'logfx'
import type { ParsedArgs } from './utils'
import { validateUrl, validateInterval } from './utils'

const VERSION = '0.2.0'

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    urls: [],
    interval: 30,
    version: false,
    help: false,
    noClear: false,
    json: false,
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    
    if (arg === '-h' || arg === '--help') {
      result.help = true
      return result
    }
    
    if (arg === '-v' || arg === '--version') {
      result.version = true
      return result
    }
    
    if (arg === '-i' || arg === '--interval') {
      if (index + 1 >= args.length) {
        log.error('--interval requires a value')
        process.exit(1)
      }
      try {
        result.interval = validateInterval(args[++index])
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
      continue
    }
    
    if (arg === '-d' || arg === '--degraded-threshold') {
      if (index + 1 >= args.length) {
        log.error('--degraded-threshold requires a value')
        process.exit(1)
      }
      try {
        result.degradedThreshold = validateInterval(args[++index])
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
      continue
    }
    
    if (arg === '--no-clear') {
      result.noClear = true
      continue
    }
    
    if (arg === '--json') {
      result.json = true
      continue
    }
    
    if (arg === '--export') {
      if (index + 1 >= args.length) {
        log.error('--export requires a format (json or csv)')
        process.exit(1)
      }
      const format = args[++index]
      if (format !== 'json' && format !== 'csv') {
        log.error('--export format must be "json" or "csv"')
        process.exit(1)
      }
      result.export = format
      continue
    }
    
    if (arg === '-o' || arg === '--output') {
      if (index + 1 >= args.length) {
        log.error('--output requires a file path')
        process.exit(1)
      }
      result.output = args[++index]
      continue
    }
    
    if (arg === '-m' || arg === '--method') {
      if (index + 1 >= args.length) {
        log.error('--method requires a value (GET, POST, PUT, PATCH, DELETE)')
        process.exit(1)
      }
      const method = args[++index].toUpperCase()
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        log.error(`Invalid method: ${method}. Must be one of: GET, POST, PUT, PATCH, DELETE`)
        process.exit(1)
      }
      result.method = method
      continue
    }
    
    if (arg === '-b' || arg === '--body') {
      if (index + 1 >= args.length) {
        log.error('--body requires a value')
        process.exit(1)
      }
      result.body = args[++index]
      continue
    }
    
    try {
      const validatedUrl = validateUrl(arg)
      result.urls.push(validatedUrl)
    } catch (error) {
      log.warn(`Skipping invalid argument: ${arg}`, {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

export function printHelp() {
  const { box } = require('logfx')
  box([
    'UpStatus - Simple Uptime Monitor',
    '',
    'Usage:',
    '  upstatus <url1> <url2> ... [options]',
    '',
    'Options:',
    '  -i, --interval <seconds>       Check interval (default: 30, min: 1)',
    '  -d, --degraded-threshold <ms>  Response time threshold for degraded (default: 2000)',
    '  -m, --method <method>          HTTP method (GET, POST, PUT, PATCH, DELETE)',
    '  -b, --body <body>              Request body (for POST/PUT/PATCH)',
    '  -o, --output <file>            Save output to file',
    '  --export <format>              Export format (json, csv)',
    '  --json                         JSON output mode (for CI/scripts)',
    '  --no-clear                     Disable terminal clearing',
    '  -v, --version                  Show version',
    '  -h, --help                     Show this help',
    '',
    'Examples:',
    '  upstatus https://api.example.com',
    '  upstatus https://site1.com https://site2.com -i 60',
    '  upstatus https://api.example.com -m POST -b \'{"key":"value"}\'',
    '  upstatus https://api.example.com --export json -o results.json',
  ], { title: '📡 UpStatus', borderColor: 'cyan' })
}

export function printVersion() {
  console.log(`upstatus v${VERSION}`)
}

