import { writeFile } from 'node:fs'

import { getTcpTemplate } from './templates/tcp.js'
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
export const generateClientStub = (config: Config, target: string, functions: ConfigFunctionSignature): void => {

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

  writeFile(target, template, () => {
    console.log('successfully written client stub.')
  })
}