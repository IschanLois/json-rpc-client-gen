import stub from './client-stub/index.js'

stub.on('connect', async () => {
  console.log(await Promise.all([stub.add(1, 2), stub.subtract(5, 3)]))
})

stub.connect()
