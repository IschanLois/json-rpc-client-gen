export interface TcpConfig {
  host: string
  port: number
  version: '1.0' | '2.0'
  timeout: number
}

export const getTcpTemplate = (config: TcpConfig, methods: string): string => `// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const USER_TIMEOUT = ${config.timeout}
const VERSION = ${config.version}

const createTimeout = (socket) => {
  if (USER_TIMEOUT) {
    return setTimeout(() => {
      socket.destroy()
    }, ${config.timeout})
  }

  return null
}

class RpcServerError extends Error {
  code = null
  data = null

  constructor(code, message, data) {
    this.data = data || null

    switch (code) {
      case -32700:
        super(message || 'Parse error')
        break
      case -32600:
        super(message || 'Invalid Request')
        break
      case -32601:
        super(message || 'Method not found')
        break
      case -32602:
        super(message || 'Invalid params')
        break
      case -32603:
        super(message || 'Internal error')
        break
      default:
        super(message || 'Unknown error')
        break
    }
  }
}

// TODO embed throttling using max requests for a given time
class Stub extends EventEmitter {

  #socket = null
  #timeout = null
  #currentRequestId = 0
  #requestResolvers = new Map()
  #pendingResponses = ['']

  #parsePendingResponses() {
    while (this.#pendingResponses.length > 1) {
      const rawResponse = this.#pendingResponses.shift()
      let parsedResponse

      try {
        parsedResponse = JSON.parse(rawResponse)
      } catch (error) {
        // TODO logging options
        console.error('Failed to parse response:', rawResponse, error)
        continue
      }

      const { id, result, error } = parsedResponse
      
      // notification
      if (id === null) {
        return
      }

      const requestResolver = this.#requestResolvers.get(id)

      // ignore non-matching response for better security
      if (!requestResolver) {
        return
      }

      this.#requestResolvers.delete(id)

      if (error) {
        throw new RpcServerError(...error)
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
      // TODO logging options
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
    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }

    if (!this.#socket || this.#socket.destroyed) {
      return
    }

    this.#socket.destroy()
    this.emit('close')
  }

  ${methods}
}

const clientStub = new Stub()

export default clientStub

`
