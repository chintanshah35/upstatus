import type { MonitorStats } from './types'

export function exportToJson(stats: MonitorStats[]): string {
  return JSON.stringify(stats, null, 2)
}

export function exportToCsv(stats: MonitorStats[]): string {
  const headers = ['URL', 'Name', 'Checks', 'Uptime %', 'Avg Response Time (ms)', 'Last Status', 'Last Check Time']
  const rows = stats.map(stat => [
    stat.url,
    stat.name,
    stat.checks.toString(),
    stat.uptime.toString(),
    stat.avgResponseTime.toString(),
    stat.lastCheck?.status || 'N/A',
    stat.lastCheck?.timestamp.toISOString() || 'N/A'
  ])
  
  const csvRows = [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  )
  
  return csvRows.join('\n')
}

export async function writeExport(data: string, filePath: string): Promise<void> {
  const fs = await import('fs/promises')
  await fs.writeFile(filePath, data, 'utf-8')
}

