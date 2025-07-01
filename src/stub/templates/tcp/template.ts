
  export const template = `import EventEmitter from 'node:events';
import {connect} from 'node:net';
import JsonRpcError from './jsonRpcError.js';
const SOCKET_TIMEOUT = 360000;
const VERSION = '2.0';
class Stub extends EventEmitter {
  #socket = null;
  #currentRequestId = 0;
  #requestHandlers = new Map();
  #pendingResponses = [''];
  #handleResponse(parsedResponse) {
    const {id, result, error} = parsedResponse;
    if (id === null) {
      return;
    }
    const requestHandler = this.#requestHandlers.get(id);
    if (!requestHandler) {
      return;
    }
    this.#requestHandlers.delete(id);
    if (error) {
      const rpcError = new JsonRpcError(error.code, error.message, error.data);
      requestHandler.reject(rpcError);
    } else {
      requestHandler.resolve(result);
      setImmediate(() => {
        this.emit('data', parsedResponse);
      });
    }
  }
  #parsePendingResponses(data) {
    const serverData = data.toString().split('\n');
    this.#pendingResponses[0] += serverData.shift();
    this.#pendingResponses.push(...serverData);
    while (this.#pendingResponses.length > 1) {
      const rawResponse = this.#pendingResponses.shift();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch {
        setImmediate(() => {
          this.emit('error', new Error(`Malformed server response ${rawResponse}`));
        });
        continue;
      }
      if (Array.isArray(parsedResponse)) {
        parsedResponse.forEach(response => {
          this.#handleResponse(response);
        });
      } else {
        this.#handleResponse(parsedResponse);
      }
    }
  }
  #sendRequest(method, params = {}, isNotification = false) {
    if (!this.#socket || this.#socket.destroyed) {
      this.connect();
    }
    const requestId = isNotification ? null : this.#currentRequestId;
    const message = JSON.stringify({
      id: requestId,
      jsonrpc: VERSION,
      method,
      params
    });
    this.#currentRequestId += 1;
    this.#socket.write(`${message}\n`);
    if (requestId === null) {
      return null;
    }
    return new Promise((resolve, reject) => {
      this.#requestHandlers.set(requestId, {
        resolve,
        reject
      });
    });
  }
  connect() {
    this.#socket = connect({
      host: 'localhost',
      port: 25
    });
    this.#socket.on('data', data => {
      this.#parsePendingResponses(data);
    });
    this.#socket.once('error', error => {
      this.#socket.destroy();
      this.emit('error', error);
    });
    const connectionTimeout = setTimeout(() => {
      this.#socket.destroy();
      this.emit('error', new Error('TCP handshake timeout'));
    }, 360000);
    this.#socket.once('connect', () => {
      clearTimeout(connectionTimeout);
      this.#socket.setTimeout(SOCKET_TIMEOUT || 0, () => {
        this.close();
        this.emit('timeout');
      });
      this.emit('connect');
    });
    this.#socket.once('close', () => this.close());
  }
  close() {
    this.emit('close');
    if (!this.#socket) {
      return;
    }
    this.#socket.destroy();
  }
  addTodo(title, description) {
    return this.#sendRequest('addTodo', {
      title,
      description
    });
  }
  getTodos() {
    return this.#sendRequest('getTodos');
  }
  deleteTodo(id) {
    return this.#sendRequest('deleteTodo', {
      id
    });
  }
  updateTodo(id, title, description) {
    return this.#sendRequest('updateTodo', {
      id,
      title,
      description
    });
  }
  batch(requests) {
    if (!Array.isArray(requests)) {
      throw new Error('batched requests must be an array');
    }
    if (requests.length === 0) {
      return;
    }
    const messages = [];
    const handlers = [];
    requests.forEach(request => {
      if (typeof request.method !== 'string') {
        throw new Error('parameter method must be a string');
      }
      if (!((request.method in this))) {
        throw new Error(`invalid method ${request.method} in batch request`);
      }
      if (('isNotification' in request) && typeof request.isNotification !== 'boolean') {
        throw new Error('parameter isNotification must be a boolean');
      }
      if (('params' in request) && typeof request.params !== 'object') {
        throw new Error('parameter params must be an object');
      }
      const requestId = request.isNotification ? null : this.#currentRequestId++;
      messages.push(JSON.stringify({
        id: requestId,
        jsonrpc: VERSION,
        method: request.method,
        params: request.params || []
      }));
      handlers.push(new Promise((resolve, reject) => {
        this.#requestHandlers.set(requestId, {
          resolve,
          reject
        });
      }));
    });
    this.#socket.write(`${JSON.stringify(messages)}\n`);
    return handlers;
  }
}
const clientStub = new Stub();
export default clientStub;
`
  