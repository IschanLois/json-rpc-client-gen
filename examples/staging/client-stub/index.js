// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const USER_TIMEOUT = 1000
const VERSION = 2.0

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
        this.emit('error', new Error(`Malformed server response ${rawResponse}`))
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

    const requestId = isNotification ? null : this.#currentRequestId

    const message = JSON.stringify({
      id: requestId,
      jsonrpc: VERSION,
      method,
      params,
    })

    this.#currentRequestId += 1
    this.#socket.write(`${message}\n`)

    if (requestId === null) {
      return null
    }
    
    return new Promise((resolve, reject) => {
      this.#requestHandlers.set(requestId, { resolve, reject })
    })
  }

  connect() {
    this.#socket = connect({ host: 'localhost', port: 25 })

    this.#socket.on('data', (data) => {
      const serverData = data.toString().split('\n')
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
    }, 360000)

    this.#socket.once('connect', () => {
      clearTimeout(connectionTimeout)

      this.#socket.setTimeout(USER_TIMEOUT || 0, () => {
        this.close()
        this.emit('timeout')
      })

      this.emit('connect')
    })
  }

  close() {
    if (!this.#socket || this.#socket.destroyed) {
      return
    }

    this.#socket.destroy()
    this.emit('close')
  }

  add(a, b) {
    return this.#sendRequest('add', { a, b })
  }

  subtract(a, b) {
    return this.#sendRequest('subtract', { a, b })
  }

  todos(ids) {
    return this.#sendRequest('todos', { ids })
  }
}

const clientStub = new Stub()

export default clientStub

