import stub from './client-stub/index.js'

stub.on('connect', async () => {
  console.log('Connected to the Todo RPC server')

  try {
    await stub.addTodo('Buy groceries', 'Milk, Bread, Eggs')
    console.log(await stub.getTodos())
    await stub.addTodo('Study', 'Node.js and RPC')
    console.log(await stub.getTodos())
    await stub.updateTodo(0, 'Buy groceries', 'Milk, Bread, Eggs, Butter')
    console.log(await stub.getTodos())
    await stub.deleteTodo(0)
    console.log(await stub.getTodos())
    await stub.deleteTodo(10)
    console.log(await stub.getTodos())
  } catch (err) {
    console.log(err)
  }
  

  stub.on('error', (error) => {
    console.log(error)
  })
})

stub.connect()
