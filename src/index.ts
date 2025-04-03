import { isAbsolute, join, normalize } from 'node:path'
import { readFileSync } from 'node:fs'

import { readConfigFile } from './utils.js'
import type { ConfigFunctionSignature } from './types.js'

const { path, config } = readConfigFile()
const functionsFile = isAbsolute(config.source) ? config.source : join(normalize(path), config.source)

const functions: ConfigFunctionSignature = JSON.parse(readFileSync(functionsFile, 'utf-8'))

if (functions !== Object(functions) && !Array.isArray(functions)) {
  throw new Error('Invalid functions file configuration')
}

Object.keys(functions).map((name) => {
  const signature = functions[name]

  if (
    Object.keys(signature).length !== 2
    || !('parameters' in signature)
    || !('returnType' in signature)
  ) {
    throw new Error(`Invalid function signature for ${name}`)
  }
})
