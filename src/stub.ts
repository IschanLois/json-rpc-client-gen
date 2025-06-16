import { writeFile } from 'node:fs'

import { getTcpTemplate } from './templates/tcp.js'
import type { Config, ConfigFunctionSignature } from './types.js'

const DEFAULT_TIMEOUT = 5000

const appendMethod = (
  currentMethodsString: string,
  functionName: string,
  parameters: string[],
): string => {
  const stringParams: string = parameters.join(', ')

  return `${currentMethodsString}

  ${functionName}(${stringParams}) {
    return this.#sendRequest('${functionName}', { ${stringParams} })
  }`
}

export const generateClientStub = ({
  timeout,
  host,
  port,
}: Config,
  target: string,
  functions: ConfigFunctionSignature,
): void => {

  const methods: string = Object
    .entries(functions)
    .reduce((prev, cur): string => {
      const [name, { parameters }] = cur
      return appendMethod(prev, name, parameters)
    }, '')
    .trimStart()

  const userTimeout = timeout !== undefined ? timeout : DEFAULT_TIMEOUT

  const template = getTcpTemplate({ host, port, timeout: userTimeout }, methods)

  writeFile(target, template, (err) => {
    if (err) {
      console.error(err)
      return
    }

    console.log('successfully written client stub.')
  })
}