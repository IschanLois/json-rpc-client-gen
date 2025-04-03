import { connect } from 'node:net'

let socket

process.on('SIGTERM', () => {
  if (socket && !socket.destroyed) {
    socket.destroy()
  }

  process.exit(0)
})

const initializeSocket = () => {
  socket = connect({
    host: '127.0.0.1',
    port: 25,
  })
  
  socket.on('error', (error) => {
    console.error(error.message)
    socket.destroy()
  })
  
  socket.on('data', (data) => {
    console.log(data.toString())
  })
}

const sendRequest = (method, parameters) => {
  if (!socket || socket.destroyed) {
    initializeSocket()
  }

  socket.on('connect', () => {
    console.log('Connected to the server')
  })

  socket.write(`${JSON.stringify({ method, parameters })}\n`)
}

export const add = (a, b) => {
  sendRequest('add', { a, b })
}
