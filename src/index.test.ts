
import { describe, expect, test } from 'vitest'

import SfAsync from '.'

describe('SfAsync', async () => {
  const req = { query: {} }
  const res = { locals: {} }
  const params = { id: 1 }

  class DemoAsync extends SfAsync {
    async getData (req, res, params) {
      return { req, res, params }
    }
  }

  test('req res params', async () => {
    const demoAsync = new DemoAsync(req, res, params)

    const result = await demoAsync.run([])
    expect(result).toStrictEqual({})

    const { getData } = await demoAsync.run(['getData'])

    expect(getData).toHaveProperty('req', req)
    expect(getData).toHaveProperty('res', res)
    expect(getData.params).toHaveProperty('id', 1)
    expect(getData.params).toHaveProperty('deps', {})
  })

  class DemoAsync2 extends SfAsync {
    deps = {
      getSize: ['getTag'],
      getData: ['getSize']
    }
    async getTag () {
      return 'dress'
    }
    async getSize (req, res, { deps, id }) {
      const { getTag } = deps
      return { size: 'XL', tag: getTag, id }
    }
    async getData (req, res, { deps }) {
      const { getSize } = deps
      return { ...getSize }
    }
  }

  test('serial', async () => {
    const demoAsync2 = new DemoAsync2(req, res, params)
    const { getData } = await demoAsync2.run(['getData'])
    
    expect(getData).toHaveProperty('size', 'XL')
    expect(getData).toHaveProperty('tag', 'dress')
    expect(getData).toHaveProperty('id', 1)
  })
})
