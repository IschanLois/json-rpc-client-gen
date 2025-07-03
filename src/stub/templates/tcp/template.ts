
  export const template = `import EventEmitter from 'node:events';
import {connect} from 'node:net';
import {configs} from './configs.js';
import JsonRpcError from './jsonRpcError.js';
const SOCKET_TIMEOUT = configs.socketTimeout;
const VERSION = configs.version;
class Stub extends EventEmitter {
  #socket = null;
  #currentRequestId = 0;
  #requestHandlers = new Map();
  #pendingResponses = [''];
  connect() {
    this.#socket = connect({
      host: ${config.host},
      port: ${config.port}
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
    }, configs.connectionTimeout);
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
  ${methods};
}
const clientStub = new Stub();
export default clientStub;
`
  