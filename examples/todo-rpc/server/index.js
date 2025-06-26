import { createServer } from 'node:net'

import { ServerError } from './error.js'

const todos = []

const functions = {
  addTodo(title, description) {
    todos.push({ title, description, deleted: false })
    return todos.length - 1
  },

  getTodos() {
    return todos.filter(todo => !todo.deleted)
  },

  deleteTodo(id) {
    if (id < 0 || id >= todos.length) {
      throw new ServerError('Invalid params', -32602, { invalidParam: 'id' })
    }

    todos[id].deleted = true

    return id
  },

  updateTodo(id, title, description) {
    if (id < 0 || id >= todos.length) {
      throw new ServerError('Invalid params', -32602, { invalidParam: 'id' })
    }

    todos[id].title = title || todos[id].title
    todos[id].description = description || todos[id].description

    return id
  },
}

const requests = ['']
let currentSocket = null

const handleRequest = (parsedRequest) => {
  const { id, method, params } = parsedRequest

  let message

  try {
    message = {
      id,
      method,
      result: functions[method](...Object.values(params)),
      error: null,
    }
  } catch (error) {
    message = {
      id,
      method,
      result: null,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal server error',
        data: error.data || null,
      },
    }
  }

  return message
}

const parseRequests = (data) => {
  const rawRequests = data.toString().split('\n')
  requests[requests.length - 1] += rawRequests.shift()
  requests.push(...rawRequests)

  while (requests.length > 1) {
    console.log(`Received request: ${requests[0]}`)
    const parsedRequest = JSON.parse(requests.shift())

    if (Array.isArray(parsedRequest)) {
      const message = parsedRequest.map((request) => {
        return handleRequest(JSON.parse(request))
      })
      currentSocket.write(`${JSON.stringify(message)}\n`)
    } else {
      currentSocket.write(`${JSON.stringify(handleRequest(parsedRequest))}\n`)
    }
  }
}

createServer((socket) => {
  console.log('Client connected')

  currentSocket = socket

  socket.on('data', parseRequests)

  socket.on('end', () => {
    console.log('Client disconnected')
    socket.destroy()
  })
}).listen(25, () => {
  console.log('Server listening on port 25')
})
