
export default class SfAsync {
  #req = null
  #res = null
  #params = null
  #timeMap = new Map()
  #promiseMap = new Map()
  #result = {}
  deps = {}

  constructor (req, res, params) {
    this.#req = req
    this.#res = res
    this.#params = params || {}
  }

  #hrtime (field) {
    if (this.#timeMap.has(field)) {
      return
    }
    this.#timeMap.set(field, {})
    const start = Date.now()

    return () => {
      const end = Date.now()
      this.#timeMap.set(field, {
        start,
        duration: end - start,
      })
    }
  }

  async #execPromise (field) {
    if (this.#result[field]) {
      return
    }
    if (this.#promiseMap.has(field)) {
      this.#result[field] = await this.#promiseMap.get(field)
      return
    }
    const endFn = this.#hrtime(field)
    const p = this.#serial(field)
    this.#promiseMap.set(field, p)
    this.#result[field] = await p
    endFn?.()
  }

  #validDeps () {
    Object.keys(this.deps).forEach(field => {
      if (!this[field]) {
        throw new Error(`SfAsync: Invalid field in deps: ${field}`)
      }
      this.deps[field].forEach(depField => {
        if (!this[depField]) {
          throw new Error(`SfAsync: Invalid field in deps[${field}]: ${depField}`)
        }
      })
    })
  }

  #validate (fields) {
    this.#validDeps()
    ;(fields || []).forEach(field => {
      if (!this[field]) {
        throw new Error(`SfAsync: Invalid field in classMethods: ${field}`)
      }
    })
  }

  async #serial (field) {
    const depFields = this.deps[field] || []
    await this.#parallel(depFields)

    const deps = depFields.reduce((total, curr) => {
      total[curr] = this.#result[curr]
      return total
    }, {})
    return await this[field](this.#req, this.#res, { deps, ...this.#params })
  }

  async #parallel (fields) {
    const arr = fields.map(field => this.#execPromise(field))
    await Promise.allSettled(arr).catch(error => {
      console.log(error)
    })
  }

  async run (fields = []) {
    const endFn = this.#hrtime('_totalTime')
    this.#validate(fields)
    await this.#parallel(fields)
    endFn?.()
    return this.#result
  }
}
