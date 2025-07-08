import { writeFile, readdir, copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'

import { getTcpTemplate } from './templates/tcp/index.js'
import type { Config, ConfigFunctionSignature } from '../types.js'

const DEFAULT_TCP_SOCKET_TIMEOUT = 60000 * 5
const DEFAULT_VERSION = '2.0'
const DEFAULT_TCP_CONNECTION_TIMEOUT = 60000 * 5

const appendMethod = (
  currentMethodsString: string,
  functionName: string,
  parameters: string[],
): string => {
  const stringParams: string = parameters.join(', ')
  const sendReqParams = parameters.length > 0 ? `, { ${stringParams} }` : ''

  return `${currentMethodsString}

  ${functionName}(${stringParams}) {
    return this.#sendRequest('${functionName}'${sendReqParams})
  }`
}

// TODO: add TLS support
export const generateClientStub = async (config: Config, targetFile: string, functions: ConfigFunctionSignature): Promise<void> => {

  const methods: string = Object
    .entries(functions)
    .reduce((prev, cur): string => {
      const [name, { parameters }] = cur
      return appendMethod(prev, name, parameters)
    }, '')
    .trimStart()

  const template = getTcpTemplate({
    socketTimeout: config.socketTimeout || DEFAULT_TCP_SOCKET_TIMEOUT,
    version: config.version || DEFAULT_VERSION,
    connectionTimeout: config.connectionTimeout || DEFAULT_TCP_CONNECTION_TIMEOUT,
    ...config,
  }, methods)

  const targetDir = dirname(targetFile)

  const copyFiles = (await readdir(join(import.meta.dirname, 'templates', 'tcp')))
    .reduce<Promise<void>[]>((allDeps: Promise<void>[], dep) => {
      if (['index.js', 'template.js'].includes(dep)) {
        return allDeps
      }

      allDeps.push(copyFile(
        join(import.meta.dirname, 'templates', 'tcp', dep),
        join(targetDir, dep),
      ))

      return allDeps
    },
    [],
  )

  await Promise.all([
    writeFile(targetFile, template).then(() => { console.log('✅ successfully created client stub') }),
    copyFiles,
  ])

  console.log('✅ successfully copied dependencies')
}