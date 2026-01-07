#!/usr/bin/env node

import { log, box, table, badge } from 'logfx'
import { MonitorManager } from './monitor'
import { parseArgs, printHelp, printVersion } from './args'
import { isTTY } from './utils'
import { exportToJson, exportToCsv, writeExport } from './export'

const args = process.argv.slice(2)
const parsed = parseArgs(args)

if (parsed.help) {
  printHelp()
  process.exit(0)
}

if (parsed.version) {
  printVersion()
  process.exit(0)
}

if (parsed.urls.length === 0) {
  log.info('No URLs provided, running demo mode')
  parsed.urls.push(
    'https://httpstat.us/200',
    'https://httpstat.us/500',
    'https://api.github.com'
  )
}

async function main() {
  if (isTTY() && !parsed.noClear) {
    console.clear()
  }
  
  badge('UpStatus v0.1.0', 'cyan')
  console.log('')

  const manager = new MonitorManager()
  
  parsed.urls.forEach((url) => {
    manager.add({
      url,
      interval: parsed.interval,
      degradedThreshold: parsed.degradedThreshold,
      method: parsed.method as any,
      body: parsed.body,
    })
  })

  if (!parsed.json) {
    table(parsed.urls.map((url) => ({ url, interval: `${parsed.interval}s`, status: 'starting...' })))
    console.log('')
  }

  manager.startAll()

  let checkCount = 0
  const statsInterval = setInterval(() => {
    if (++checkCount % 5 === 0) {
      if (parsed.json) {
        const stats = Array.from(manager.monitors.values()).map(monitor => monitor.getStats())
        console.log(JSON.stringify(stats, null, 2))
      } else {
        manager.printAllStats()
      }
    }
  }, parsed.interval * 1000)

  const shutdown = async () => {
    clearInterval(statsInterval)
    console.log('\n')
    log.warn('Shutting down...')
    manager.stopAll()
    
    if (parsed.export) {
      const stats = Array.from(manager.monitors.values()).map(monitor => monitor.getStats())
      const exported = parsed.export === 'json' 
        ? exportToJson(stats)
        : exportToCsv(stats)
      
      if (parsed.output) {
        await writeExport(exported, parsed.output)
        log.success(`Exported to ${parsed.output}`)
      } else {
        console.log(exported)
      }
    } else {
      if (!parsed.json) {
        console.log('\n')
        box('Final Statistics', { title: '📊 Summary', borderColor: 'yellow' })
        manager.printAllStats()
      }
    }
    
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  process.stdin.resume()
}

main().catch((err) => {
  log.error('Fatal error', err)
  process.exit(1)
})
