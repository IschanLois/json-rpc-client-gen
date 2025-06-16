// code-generated file - es-rpcgen
import EventEmitter from 'node:events'
import { connect } from 'node:net'

const userTimeout = 2500

const createTimeout = (socket) => {
  if (userTimeout) {
    return setTimeout(() => {
      socket.destroy()
    }, 2500)
  }

  return null
}

class Stub extends EventEmitter {

  #socket = null
  #timeout = null

  async #sendRequest(method, parameters) {
    if (!this.#socket || this.#socket.destroyed) {
      await this.connect()
    }

    if (this.#timeout) {
      clearTimeout(this.#timeout)
    }
    
    // TODO add parallelism support
    return new Promise((resolve) => {
      this.#socket.on('data', (data) => {
        const { returnValue } = JSON.parse(data.toString())
        resolve(returnValue)
      })
  
      this.#socket.write(`${JSON.stringify({ method, parameters })}\n`)
      this.#timeout = createTimeout(this.#socket)
    })
  }

  async connect() {
    this.#socket = connect({ host: '127.0.0.1', port: 25 })

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
