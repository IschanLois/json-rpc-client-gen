export interface Config {
  source: string
  host: string
  port: number
  targetDir: string
  version?: '1.0' | '2.0'
  timeout?: number
}

export interface ConfigFunctionSignature {
  [key: string]: {
    parameters: string[]
  }
}
