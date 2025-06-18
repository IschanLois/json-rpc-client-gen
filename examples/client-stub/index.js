// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const USER_TIMEOUT = 2500
const VERSION = 2.0

const createTimeout = (socket) => {
  if (USER_TIMEOUT) {
    return setTimeout(() => {
      socket.destroy()
    }, 2500)
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

// TODO embed throttling using max requests for a given time
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
        this.emit('error', rpcError)
      } else {
        requestHandler.resolve(result)
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
    this.#socket.write(`${message}\n`)
    this.#timeout = createTimeout(this.#socket)

    if (requestId === null) {
      return null
    }
    
    return new Promise((resolve, reject) => {
      this.#requestHandlers.set(requestId, { resolve, reject })
    })
  }

  async connect() {
    this.#socket = connect({ host: '127.0.0.1', port: 25 })

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


