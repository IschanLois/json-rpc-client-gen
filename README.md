# json-rpc-client-gen

A `Node` client stub generator for [JSON-RPC](https://www.jsonrpc.org/specification) Systems

---
**NOTE**
This package is in experimental phase and currently only supports TCP/IP for communication.

---

This wraps the complexities of:

1. Client to server network communication.
2. Sending and parsing JSON-RPC network requests and responses.

## Getting started
1. Make sure than Node is installed. The binary can run on Node `v12` but `v18` or higher is recommended.
   - Currently, the project only supports ES Module resolution which is fully supported by Node `v12` and higher.
2. In your project, create a configuration file `jsonrpcgen.config.json`
   - The config file will be read from the `CWD` upwards.
   - See [Configuration file](#configuration-file) section for options.
3. Run the binary to generate the client stub for your RPC server.

   ```
   json-rpc-client-gen
   ```

   or

   ```
   npx json-rpc-client-gen
   ```


## Sample Usage

```JavaScript
import stub from './client-stub/index.js'

stub.on('connect', async () => {
  // Event Emitter data access
  stub.on('data', (data) => {
    console.log('data received:', data)
  })
  
  // Promises data access
  console.log(await Promise.all([stub.add(1, 2), stub.subtract(5, 2)]))
})

stub.connect()
```

## Client stub
- The client stub code generated currently only supports ESM.
- There's some support pseudo-parallelism using [Promise API static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). **But currently it only uses one socket stream**, hence data is sent and obtained from the same layer 4 source. Support for TCP sockets pooling will be implemented in the future.
- Methods will implicitly connect to the server if the socket is closed/destroyed, however the requests can be buffered in user memory if not yet connected.  You can choose to explicitly call the `connect` method on the stub if you want appropriate stub lifecycle handling.

## Stub error handling

### Method response error

`rejects` with the `error` (see [JSON-RPC specification](https://www.jsonrpc.org/specification)) payload from the response.

### Stub errors
Includes:
- Receiving malformed messages
- Timeouts
- Socket errors

This will be emitted with the `error` event so appropriate on `error` handler can be given so it would not be thrown. This is emitted asynchronously so as to limit the interference with important synchronous operations of the consumer and the stub.

```JavaScript
stub.on('error', (err) => {
   ...
})
```

### Usage error

This will be `thrown` such as the wrong usage of the `batch` method (see [Batching](#batching)). This provides granular error handling for synchronous errors.

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
  console.log(result)
})
```
- Emitted result is the `RAW JSON` response.

## Batching
- As mentioned above, consumers can do their own batching using [Promise API static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
- The stub also exposes a `batch` method, an implementation of the JSON-RPC batch specification. This allows a consumer to pass RPC in object form. This would return a list of promises corresponding to the RPC at each index. See usage below. 

```JavaScript
// batching using promises
const [res1, res2] = await Promise.all([stubs.method1(param1), stub.method2(param1)])

// stub batching
const [res1, res2] = await stub.batch([
   { method: 'method1', params: { param1: 'param1' }, isNotification: true },
   { method: 'method2', params: { param1: 'param1' }, isNotification: false },
])
```

### Promise batching vs Batch method
- Promise batching will send the requests to the server one-by-one in a concurrent manner.
- `batch` method will send the requests to the server in an array. This returns a list of promises.

**batch method param**
```JavaScript
/**
 * params and isNotification fields are optional
 */
{
   method: 'method1', // string
   params: { param1: 'param1' }, // object of parameters for the RPC, can also be an array for positional arguments
   isNotification: true // whether the RPC is a notification
}
```


## Configuration file

| Options | Type | Default | Description | Example |
| ------- | ---- | ------- | ----------- | ------- |
| source | `string` | - | JSON file for your function | ./src/functions.esrpc.json |
| host   | `string` | - | Target server hostname or IPv4/IPv6 (uses `dns.lookup()`) | localhost |
| port   | `number` | - | Target server port | 25 |
| targetDir | `string` | - | Directory where client stub file will be emitted | ./src/client |
| version **(optional)** |`1.0` or `2.0` | `2.0` | JSON-RPC specification version | 2.0 | 
| socketTimeout **(optional)** | `number` | `300000 ms`/`5 mins` | Period in `ms` where a socket will be idle before being destroyed | 10000 |
connectionTimeout **(optional)** | `number` | `300000 ms`/`5 mins` | Period in `ms` where a TCP handshake can be successful, rejects and emits an error if timed out | 10000 |

## Functions definitions

Function signatures that your server supports are defined in a file in `source` parameter in the configuration file

```json
{
   "method1": {
      "parameters": ["param1", "param2"]
   },
   "method2": {
      "parameters": ["param1", "param2"]
   }
}
```
