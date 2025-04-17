export interface Config {
  source: string
  host: string
  port: number
  targetDir: string
  timeout?: number
}

export interface ConfigFunctionSignature {
  [key: string]: {
    parameters: ConfigParameter
    returnType: string
  }
}
export interface ConfigParameter {
  [key: string]: 'number' | 'string' | 'boolean' | 'bigint'
}
