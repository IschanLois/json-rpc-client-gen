import { createServer } from 'node:net'

const functions = {
  add({ a, b }) {
    return a + b
  }
}

createServer((socket) => {
  console.log('Client connected')

  socket.on('data', (data) => {
    console.log(`Received: ${data}`)

    const { method, parameters } = JSON.parse(data.toString())
    const returnValue = functions[method](parameters)

    socket.write(`${JSON.stringify({ method, returnValue })}\n`)
  })

  socket.on('end', () => {
    console.log('Client disconnected')
    socket.destroy()
  })
}).listen(25, () => {
  console.log('Server listening on port 25')
})
