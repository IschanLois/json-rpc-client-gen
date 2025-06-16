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

const userTimeout = ${config.timeout}

const createTimeout = (socket) => {
  if (userTimeout) {
    return setTimeout(() => {
      socket.destroy()
    }, ${config.timeout})
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
  
      this.#socket.write(\`\${JSON.stringify({ method, parameters })}\\n\`)
      this.#timeout = createTimeout(this.#socket)
    })
  }

  async connect() {
    this.#socket = connect({ host: '${config.host}', port: ${config.port} })

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