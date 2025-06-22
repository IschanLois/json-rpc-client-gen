import stub from './client-stub/index.js'

stub.on('connect', async () => {
  stub.on('data', (data) => {
    console.log('data received:', data)
  })

  stub.on('close', () => {
    console.log('Connection closed')
  })

  console.log(await Promise.all([stub.add(1, 2), stub.subtract(1, 2)]))
})

stub.connect()
