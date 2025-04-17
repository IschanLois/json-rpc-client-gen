// code-generated file - es-rpcgen

import EventEmitter from 'node:events'
import { connect } from 'node:net'

const userTimeout = 2000

const createTimeout = (socket) => {
  if (userTimeout) {
    return setTimeout(() => {
      socket.destroy()
    }, 5000)
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
    
    return new Promise((resolve) => {
      this.#socket.on('data', (data) => {
        const { returnValue } = JSON.parse(data.toString())
        resolve(returnValue)
      })
  
      this.#socket.write(`${JSON.stringify({ method, parameters })}
`)
      this.#timeout = createTimeout(this.#socket)
    })
  }

  async connect() {
    this.#socket = connect({ host: '127.0.0.1', port: 25 })

    this.#socket.once('error', (error) => {
      console.error(error.message)
      socket.destroy()
      process.exit()
    })

    await new Promise((resolve) => {
      this.#socket.once('connect', () => {
        this.emit('connect')
        this.#timeout = createTimeout(this.#socket)
        resolve()
      })
    })
  }

  close() {
    if (this.#socket || !this.#socket.destroyed) {
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
