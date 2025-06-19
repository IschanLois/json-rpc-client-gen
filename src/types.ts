export interface Config {
  source: string
  host: string
  port: number
  targetDir: string
  version?: '1.0' | '2.0'
  socketTimeout?: number
  connectionTimeout?: number
}

export interface ConfigFunctionSignature {
  [key: string]: {
    parameters: string[]
  }
}
