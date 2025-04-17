import stub from './client-stub/index.js'

console.log(await stub.add(1, 2))
console.log(await stub.subtract(5, 3))
console.log(await stub.todos([1, 2, 3]))
