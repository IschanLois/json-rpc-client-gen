export interface Config {
  source: string
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
