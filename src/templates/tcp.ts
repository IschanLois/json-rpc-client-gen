export interface TcpConfig {
  host: string
  port: number
  timeout?: number
}

// TODO: add data buffering
// TODO: add authentication
// TODO: add TLS support
export const getTcpTemplate = (config: TcpConfig, methods: string): string => `// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const USER_TIMEOUT = ${config.timeout}
const VERSION = '2.0'

const createTimeout = (socket) => {
  if (USER_TIMEOUT) {
    return setTimeout(() => {
      socket.destroy()
    }, ${config.timeout})
  }

  return null
}

// TODO batching -> array of request objects stub batching
// TODO embed throttling using max requests for a given time
// TODO versions
class Stub extends EventEmitter {

  #socket = null
  #timeout = null
  #currentRequestId = 0
  #requestResolvers = new Map()
  #pendingResponses = ['']

  #parsePendingResponses() {
    while (this.#pendingResponses.length > 1) {
      const rawResponse = this.#pendingResponses.shift()
      const { id, result, error } = JSON.parse(rawResponse)
      
      // notification
      if (id === null) {
        return
      }

      const requestResolver = this.#requestResolvers.get(id)

      if (!requestResolver) {
        // TODO add error handling for invalid responses
      }

      this.#requestResolvers.delete(id)

      if (error) {
        // TODO add error handling for errors
      } else {
        requestResolver(result)
        this.emit('data', rawResponse)
      }
    }
  }

  async #sendRequest(method, params, isNotification = false) {
    if (!this.#socket || this.#socket.destroyed) {
      await this.connect()
    }

    if (this.#timeout) {
      clearTimeout(this.#timeout)
    }

    const requestId = isNotification ? null : this.#currentRequestId

    const message = JSON.stringify({
      id: requestId,
      jsonrpc: VERSION,
      method,
      params,
    })

    this.#currentRequestId += 1
    this.#socket.write(\`\${message}\\n\`)
    this.#timeout = createTimeout(this.#socket)

    if (requestId === null) {
      return null
    }
    
    return new Promise((resolve) => {
      this.#requestResolvers.set(requestId, resolve)
    })
  }

  async connect() {
    this.#socket = connect({ host: '${config.host}', port: ${config.port} })

    this.#socket.on('data', (data) => {
      const serverData = data.toString().split('\\n')
      this.#pendingResponses[0] += serverData.shift()
      this.#pendingResponses.push(...serverData)
      this.#parsePendingResponses()
    })

    this.#socket.once('error', (error) => {
      console.error(error.message)
      this.#socket.destroy()
      process.exit()
    })

    await new Promise((resolve) => {
      this.#socket.once('connect', () => {
        this.#timeout = createTimeout(this.#socket)
        this.emit('connect')
        resolve()
      })
    })
  }

  close() {
    if (!this.#socket || this.#socket.destroyed) {
      return
    }

    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }

    this.#socket.destroy()
    this.emit('close')
  }

  ${methods}
}

const clientStub = new Stub()

export default clientStub
`
