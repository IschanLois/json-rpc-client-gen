export class IdGenerator {
  #currentId = -1
  #max = 0

  constructor(min, max) {
    this.#currentId = min || 0
    this.#max = max || Number.MAX_SAFE_INTEGER
  }

  getNextId() {
    this.#currentId = (this.#currentId + 1) % this.#max
    return this.#currentId
  }

  reset() {
    this.#currentId = -1
  }
}
