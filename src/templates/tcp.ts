export interface TcpConfig {
  host: string
  port: number
  version: '1.0' | '2.0'
  socketTimeout: number
  connectionTimeout: number
}

// TODO support multiple sockets and throttling if limited sockets
export const getTcpTemplate = (config: TcpConfig, methods: string): string => `// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const USER_TIMEOUT = ${config.socketTimeout}
const VERSION = ${config.version}

const createTimeout = (socket) => {
  if (USER_TIMEOUT) {
    return setTimeout(() => {
      socket.destroy()
    }, ${config.socketTimeout})
  }

  return null
}

class RpcServerError extends Error {
  code = null
  data = null

  constructor(code, message, data) {
    this.data = data || null
    this.code = code || -32603

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

class Stub extends EventEmitter {

  #socket = null
  #timeout = null
  #currentRequestId = 0
  #requestHandlers = new Map()
  #pendingResponses = ['']

  #parsePendingResponses() {
    while (this.#pendingResponses.length > 1) {
      const rawResponse = this.#pendingResponses.shift()
      let parsedResponse

      try {
        parsedResponse = JSON.parse(rawResponse)
      } catch {
        this.emit('error', new Error(\`Malformed server response \${rawResponse}\`))
        continue
      }

      const { id, result, error } = parsedResponse
      
      // notification
      if (id === null) {
        return
      }

      const requestHandler = this.#requestHandlers.get(id)

      // ignore non-matching response for better security
      if (!requestHandler) {
        return
      }

      this.#requestHandlers.delete(id)

      if (error) {
        const rpcError = new RpcServerError(error.code, error.message, error.data)
        requestHandler.reject(rpcError)
      } else {
        requestHandler.resolve(result)
        this.emit('data', rawResponse)
      }
    }
  }

  #sendRequest(method, params, isNotification = false) {
    if (!this.#socket || this.#socket.destroyed) {
      this.connect()
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
    
    return new Promise((resolve, reject) => {
      this.#requestHandlers.set(requestId, { resolve, reject })
    })
  }

  connect() {
    this.#socket = connect({ host: '${config.host}', port: ${config.port} })

    this.#socket.on('data', (data) => {
      const serverData = data.toString().split('\\n')
      this.#pendingResponses[0] += serverData.shift()
      this.#pendingResponses.push(...serverData)
      this.#parsePendingResponses()
    })

    this.#socket.once('error', (error) => {
      this.#socket.destroy()
      this.emit('error', error)
    })

    const connectionTimeout = setTimeout(() => {
      this.#socket.destroy()
      this.emit('error', new Error('TCP handshake timeout'))
    }, ${config.connectionTimeout})

    this.#socket.once('connect', () => {
      clearTimeout(connectionTimeout)
      this.#timeout = createTimeout(this.#socket)
      this.emit('connect')
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
