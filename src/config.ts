import { log } from 'logfx'
import type { MonitorConfig } from './types'

export interface ConfigFile {
  monitors?: MonitorConfig[]
  defaultInterval?: number
  defaultTimeout?: number
  defaultDegradedThreshold?: number
  defaultMaxRetries?: number
  defaultRetryDelay?: number
}

export async function loadConfigFile(filePath: string): Promise<ConfigFile> {
  try {
    const fs = await import('fs/promises')
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content) as ConfigFile
    
    if (!config.monitors || !Array.isArray(config.monitors)) {
      throw new Error('Config file must have a "monitors" array')
    }
    
    return config
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config file: ${error.message}`)
    }
    throw new Error('Failed to load config file')
  }
}

export function mergeConfigWithDefaults(
  monitor: MonitorConfig,
  defaults: ConfigFile
): MonitorConfig {
  return {
    ...monitor,
    interval: monitor.interval ?? defaults.defaultInterval,
    timeout: monitor.timeout ?? defaults.defaultTimeout,
    degradedThreshold: monitor.degradedThreshold ?? defaults.defaultDegradedThreshold,
    maxRetries: monitor.maxRetries ?? defaults.defaultMaxRetries,
    retryDelay: monitor.retryDelay ?? defaults.defaultRetryDelay,
  }
}
