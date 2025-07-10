export class JsonRpcError extends Error {

  constructor(code, message, data) {
    switch (code) {
      case -32700:
        super(message || 'Parse error')
        break
      case -32600:
        super(message || 'Invalid Request')
        break
      case -32601:
        super(message || 'Method not found')
        break
      case -32602:
        super(message || 'Invalid params')
        break
      case -32603:
        super(message || 'Internal error')
        break
      default:
        super(message || 'Unknown error')
        break
    }

    this.data = data || null
    this.code = code || -32603

    return this
  }
}
