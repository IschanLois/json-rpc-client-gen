import { template } from './template.js'

export interface TcpConfig {
  host: string
  port: number
  version: '1.0' | '2.0'
  socketTimeout: number
  connectionTimeout: number
}

export const getTcpTemplate = (config: TcpConfig, methods: string): string => template
  .replace(/{{.*}}/g, (match) => {
    if (match === '{{methods}}') {
      return methods
    }

    const configMatch = match.substring(2, match.length - 2).split('.')

    if (configMatch[0] === 'config' && configMatch[1] in config) {
      const key = configMatch[1] as keyof TcpConfig

      if (typeof config[key] === 'string') {
        return `'${config[key]}'`
      }

      return String(config[key])
    }

    return ''
  })
