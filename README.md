# json-rcp-client-gen

A client stub generator for Node [JSON-RPC](https://www.jsonrpc.org/specification) Systems

---
**NOTE**
This package is in experimental phase and currently only supports TCP/IP for communication.

---

This generators wraps the complexities of:

1. Client to server network communication.
2. Sending and parsing JSON-RPC network requests and responses.

## Getting started
1. Make sure than Node is installed. The binary can run on Node `v12` but `v18` or higher is recommended.
   - Currently, the project only supports ES Module resolution which is fully supported by Node `v12` and higher.
2. In your project, create a configuration file `esrpcgen.config.json`
   - The config fil will be read from the `CWD` upwards.
   - See [Configuration file](#configuration-file) section for options.
3. Run the command to generate the client stub for your RPC server.

   ```
   json-rpc-client-gen
   ```

   or

   ```
   npx json-rpc-client-gen
   ```

## Client stub
- The client stub code generated currently only supports ESM.
- There's some support pseudo-parallelism using [Promise API static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). **But currently it only uses one socket stream**, hence data is sent and obtained from the same layer 4 source. Support for TCP sockets pooling will be implemented in the future.
- Methods will implicitly connect to the server if the socket is closed/destroyed, however the requests can either be buffered in user memory or drained immediately depending on when the socket connects.  You can choose to explicitly call the `connect` method on the stub if you want appropriate stub lifecycle handling.

## Stub error handling

### Method response error

`rejects` with the `error` (see [JSON-RPC specification](https://www.jsonrpc.org/specification)) payload from the response.

### Stub errors
Includes:
- Receiving malformed messages
- Timeouts
- Socket errors

This will be emitted with the `error` event so appropriate on `error` handler can be given so it would not be thrown.

```JavaScript
stub.on('error', (err) => {
   ...
})
```

## Methods result access

The results of the methods exposed by the stub can be accessed via:

1. `Promises`

```JavaScript
const data = await stub.add(1, 2)
const moreData = await Promise.all([stub.add(1, 2), stub.subtract(5, 3)])

console.log(data)
```

2. `Event Emitters`

```JavaScript
stub.on('data', (result) => {
  // result is the raw JSON response
  console.log(result)
})
```
- Emitted result is the `RAW JSON` response.

## Configuration file
| Options | Type | Default | Description | Example |
| ------- | ---- | ------- | ----------- | ------- |
| source | `string` | - | JSON file where your functions are defined | ./src/functions.esrpc.json |
| host   | `string` | - | Target server hostname or IPv4/IPv6 (uses `dns.lookup()`) | localhost |
| port   | `number` | - | Target server port | 80 |
| targetDir | `string` | - | Directory where client stub file will be emitted | ./src/client |
| version **(optional)** |`1.0` or `2.0` | `2.0` | JSON-RPC specification version | 2.0 | 
| socketTimeout **(optional)** | `number` | `300000 ms`/`5 mins` | Period in `ms` where a socket will be idle before being destroyed | 10 000 |
connectionTimeout **(optional)** | `number` | `300000 ms`/`5 mins` | Period in `ms` where a TCP handshake can be successful, rejects and emits an error if timed out | 10 000|