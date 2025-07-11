import EventEmitter from 'node:events';
import {JsonRpcConnection} from './JsonRpcConnection.js';
import {IdGenerator} from './IdGenerator.js';
class Stub extends EventEmitter {
  #connection = null;
  #idGenerator = null;
  constructor() {
    super();
    this.#idGenerator = new IdGenerator(0, Number.MAX_SAFE_INTEGER);
    this.#connection = new JsonRpcConnection('localhost', 25, this.#idGenerator, {
      socketTimeout: 360000,
      version: '2.0',
      connectionTimeout: 360000
    });
    this.#connection.on('connect', () => this.emit('connect'));
    return this;
  }
  connect() {
    this.#connection.connect();
    this.#connection.on('parse', data => this.emit('data', data));
    this.#connection.on('error', error => this.emit('error', error));
    this.#connection.on('close', () => this.emit('close'));
  }
  close() {
    this.#connection.close();
    this.#idGenerator.reset();
  }
  batch(requests) {
    return this.#connection.sendBatch(requests);
  }
  addTodo(title, description, isNotification) {
    return this.#connection.sendRequest('addTodo', { title, description }, isNotification)
  }

  getTodos(isNotification) {
    return this.#connection.sendRequest('getTodos', null, isNotification)
  }

  deleteTodo(id, isNotification) {
    return this.#connection.sendRequest('deleteTodo', { id }, isNotification)
  }

  updateTodo(id, title, description, isNotification) {
    return this.#connection.sendRequest('updateTodo', { id, title, description }, isNotification)
  };
}
const clientStub = new Stub();
export default clientStub;
