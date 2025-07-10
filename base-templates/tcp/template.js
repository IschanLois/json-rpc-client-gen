import EventEmitter from 'node:events'

import { config } from './config.js'
import { JsonRpcConnection } from './JsonRpcConnection.js'
import { IdGenerator } from './IdGenerator.js'

// TODO support multiple sockets and throttling if limited sockets
// TODO id/request limiting
class Stub extends EventEmitter {

  #connection = null

  #idGenerator = null

  constructor() {
    super()

    this.#idGenerator = new IdGenerator(0, Number.MAX_SAFE_INTEGER)

    this.#connection = new JsonRpcConnection(
      config.host,
      config.port,
      this.#idGenerator,
      {
        socketTimeout: config.socketTimeout,
        version: config.version,
        connectionTimeout: config.connectionTimeout,
      },
    )

    this.#connection.on('connect', () => this.emit('connect'))

    return this
  }

  connect() {
    this.#connection.connect()

    this.#connection.on('parse', (data) => this.emit('data', data))

    this.#connection.on('error', (error) => this.emit('error', error))

    this.#connection.on('close', () => this.emit('close'))
  }

  close() {
    this.#connection.close()
    this.#idGenerator.reset()
  }

  addTodo(title, description) {
    return this.#connection.sendRequest('addTodo', { title, description })
  }

  getTodos() {
    return this.#connection.sendRequest('getTodos')
  }

  deleteTodo(id) {
    return this.#connection.sendRequest('deleteTodo', { id })
  }

  updateTodo(id, title, description) {
    return this.#connection.sendRequest('updateTodo', { id, title, description })
  }

  batch(requests) {
    return this.#connection.sendBatch(requests)
  }
}

const clientStub = new Stub()

export default clientStub
