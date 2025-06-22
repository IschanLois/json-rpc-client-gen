export class ServerError extends Error {
  constructor(message, code, data) {
    super(message)
    this.code = code
    this.data = data || null
  }
}