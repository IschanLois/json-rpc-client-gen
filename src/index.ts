import { isAbsolute, join, normalize } from 'node:path'
import { readFileSync } from 'node:fs'

import { generateClientStub } from './stub.js'
import { readConfigFile } from './utils.js'
import type { ConfigFunctionSignature } from './types.js'

const { path, config } = readConfigFile()
const functionsFile = isAbsolute(config.source) ? config.source : join(path, normalize(config.source))
const functions: ConfigFunctionSignature = JSON.parse(readFileSync(functionsFile, 'utf-8'))

if (functions !== Object(functions) || Array.isArray(functions)) {
  throw new Error('Invalid functions file configuration')
}

Object.keys(functions).forEach((name) => {
  const signature = functions[name]

  if (
    Object.keys(signature).length !== 1
    || !('parameters' in signature)
  ) {
    throw new Error(`Invalid function signature for ${name}`)
  }
})

const targetFile = join(
  isAbsolute(config.targetDir) ? '' : path,
  normalize(config.targetDir),
  'index.js',
)

generateClientStub(config, targetFile, functions)
