import { connect } from 'node:net'

let socket

const initializeSocket = () => {
  socket = connect({ host: '127.0.0.1', port: 25 })
  
  socket.once('error', (error) => {
    console.error(error.message)
    socket.destroy()
  })
}

const sendRequest = async (method, parameters) => {
  if (!socket || socket.destroyed) {
    initializeSocket()

    await new Promise((resolve) => {
      socket.once('connect', () => {
        resolve()
      })
    })
  }
  
  return new Promise((resolve) => {
    socket.on('data', (data) => {
      const { returnValue } = JSON.parse(data.toString())
      resolve(returnValue)
    })

    socket.write(`${JSON.stringify({ method, parameters })}\n`)
  })
}

class Stub {
  add(a, b) {
    return sendRequest('add', { a, b })
  }
}

export default new Stub()
