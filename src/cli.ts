#!/usr/bin/env node

import { log, box, table, badge } from 'logfx'
import { MonitorManager } from './monitor'

const args = process.argv.slice(2)

// Parse arguments
const urls: string[] = []
let interval = 30

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '-i' || arg === '--interval') {
    interval = parseInt(args[++i], 10)
  } else if (arg === '-h' || arg === '--help') {
    printHelp()
    process.exit(0)
  } else if (arg.startsWith('http')) {
    urls.push(arg)
  }
}

if (urls.length === 0) {
  log.info('No URLs provided, running demo mode')
  urls.push(
    'https://httpstat.us/200',
    'https://httpstat.us/500',
    'https://api.github.com'
  )
}

function printHelp() {
  box([
    'UpStatus - Simple Uptime Monitor',
    '',
    'Usage:',
    '  upstatus <url1> <url2> ... [options]',
    '',
    'Options:',
    '  -i, --interval <seconds>  Check interval (default: 30)',
    '  -h, --help                Show this help',
    '',
    'Examples:',
    '  upstatus https://api.example.com',
    '  upstatus https://site1.com https://site2.com -i 60',
  ], { title: '📡 UpStatus', borderColor: 'cyan' })
}

async function main() {
  console.clear()
  
  badge('UpStatus v0.1.0', 'cyan')
  console.log('')

  const manager = new MonitorManager()
  urls.forEach((url) => manager.add({ url, interval }))

  table(urls.map((url) => ({ url, interval: `${interval}s`, status: 'starting...' })))
  console.log('')

  manager.startAll()

  let n = 0
  setInterval(() => {
    if (++n % 5 === 0) manager.printAllStats()
  }, interval * 1000)

  process.on('SIGINT', () => {
    console.log('\n')
    log.warn('Shutting down...')
    manager.stopAll()
    
    console.log('\n')
    box('Final Statistics', { title: '📊 Summary', borderColor: 'yellow' })
    manager.printAllStats()
    
    process.exit(0)
  })

  process.stdin.resume()
}

main().catch((err) => {
  log.error('Fatal error', err)
  process.exit(1)
})
