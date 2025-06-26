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

    const ans = await Promise.all(stub.batch([
      { method: 'addTodo', params: { title: 'Batch Todo 1', description: 'Description 1' } },
      { method: 'addTodo', params: { title: 'Batch Todo 2', description: 'Description 2' }  },
      { method: 'addTodo', params: { title: 'Batch Todo 3', description: 'Description 3' }  },
      { method: 'addTodo', params: { title: 'Batch Todo 4', description: 'Description 4' }  },
      { method: 'addTodo', params: { title: 'Batch Todo 5', description: 'Description 6' }  },
      { method: 'getTodos' },
    ]))

    console.log(ans)

    console.log(await stub.getTodos())
  } catch (err) {
    console.log(err)
  }
  

  stub.on('error', (error) => {
    console.log(error)
  })
})

stub.connect()
