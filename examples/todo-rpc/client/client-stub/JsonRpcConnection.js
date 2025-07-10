import { Socket } from 'node:net'

import { JsonRpcError } from './JsonRpcError.js'

export class JsonRpcConnection extends Socket {
  #host = null
  #port = null

  #idGenerator = null

  #socketTimeout = 300000
  #connectionTimeout = 300000
  #jsonRpcVersion = '2.0'

  #pendingResponses = ['']
  #requestHandlers = new Map()

  constructor(host, port, idGenerator, config, socketOptions) {
    super(socketOptions)

    this.#host = host
    this.#port = port
    this.#idGenerator = idGenerator

    this.#socketTimeout = config.socketTimeout || this.#socketTimeout
    this.#connectionTimeout = config.connectionTimeout || this.#connectionTimeout
    this.#jsonRpcVersion = config.jsonRpcVersion || this.#jsonRpcVersion

    return this
  }

  #handleResponse(parsedResponse) {
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
      const rpcError = new JsonRpcError(error.code, error.message, error.data)
      requestHandler.reject(rpcError)
    } else {
      requestHandler.resolve(result)
      setImmediate(() => {
        this.emit('parse', parsedResponse)
      })
    }
  }

  #parsePendingResponses(data) {
    const serverData = data.toString().split('\n')
    this.#pendingResponses[0] += serverData.shift()
    this.#pendingResponses.push(...serverData)

    while (this.#pendingResponses.length > 1) {
      const rawResponse = this.#pendingResponses.shift()
      let parsedResponse

      try {
        parsedResponse = JSON.parse(rawResponse)
      } catch {
        setImmediate(() => {
          this.emit('error', new Error(`Malformed server response ${rawResponse}`))
        })
        continue
      }

      if (Array.isArray(parsedResponse)) {
        parsedResponse.forEach((response) => {
          this.#handleResponse(response)
        })
      } else {
        this.#handleResponse(parsedResponse)
      }
    }
  }

  connect() {
    this.once('connect', () => {
      clearTimeout(connectionTimeout)

      this.setTimeout(this.#socketTimeout, () => {
        this.close()
        this.emit('timeout')
      })

      this.on('data', (data) => {
        this.#parsePendingResponses(data)
      })
    })

    super.connect({ host: this.#host, port: this.#port })

    this.once('error', (error) => {
      this.destroy()
      this.emit('error', error)
    })

    const connectionTimeout = setTimeout(() => {
      this.destroy()
      this.emit('error', new Error('TCP handshake timeout'))
    }, this.#connectionTimeout)
  }

  /**
   * @param {string} method - The JSON-RPC method to call
   * @param {Object|*[]} params - The parameters for the method call
   * @returns {Promise<*>|null} - Returns a Promise that resolves with the result of the method call, or null if it's a notification
   */
  sendRequest(method, params, isNotification = false) {
    if (this.pending || this.destroyed) {
      this.connect()
    }

    const requestId = isNotification ? null : this.#idGenerator.getNextId()

    const message = JSON.stringify({
      id: requestId,
      jsonrpc: this.#jsonRpcVersion,
      method,
      params,
    })

    this.write(`${message}\n`)

    if (requestId === null) {
      return null
    }

    return new Promise((resolve, reject) => {
      this.#requestHandlers.set(requestId, { resolve, reject })
    })
  }

  /**
   * @param {Object[]} requests - Array of request objects that will be batched
   * @param {string} requests[i].method - The method to call
   * @param {*[]|Object} requests[i].params - The parameters for the method
   * @param {boolean} requests[i].isNotification - Whether the request is a notification
   * @return {Promise<*>[]} - Returns an array of Promises that resolve for each request in the batch
   */
  sendBatch(requests) {
    if (!Array.isArray(requests)) {
      throw new Error('batched requests must be an array')
    }

    if (requests.length === 0) {
      return
    }

    const messages = []
    const handlers = []

    requests.forEach((request) => {
      if (typeof request.method !== 'string') {
        throw new Error('parameter method must be a string')
      }

      if (!(request.method in this)) {
        throw new Error(`invalid method ${request.method} in batch request`)
      }

      if ('isNotification' in request && typeof request.isNotification !== 'boolean') {
        throw new Error('parameter isNotification must be a boolean')
      }

      if ('params' in request && typeof request.params !== 'object' && !Array.isArray(request.params)) {
        throw new Error('parameter params must be an object or an array')
      }

      const requestId = request.isNotification ? null : this.#idGenerator.getNextId()

      messages.push(JSON.stringify({
        id: requestId,
        jsonrpc: this.#jsonRpcVersion,
        method: request.method,
        params: request.params || [],
      }))

      handlers.push(new Promise((resolve, reject) => {
        this.#requestHandlers.set(requestId, { resolve, reject })
      }))
    })

    this.write(`${JSON.stringify(messages)}\n`)

    return handlers
  }
}
