
import { describe, expect, test } from 'vitest'

import SfAsync from '.'

describe('SfAsync', async () => {
  const req = { query: {} }
  const res = { locals: {} }
  const params = { id: 1 }

  test('req res params', async () => {

    class DemoAsync extends SfAsync {
      async getData (req, res, params) {
        return { req, res, params }
      }
    }

    const demoAsync = new DemoAsync(req, res, params)

    const result = await demoAsync.run([])
    expect(result).toStrictEqual({})

    const { getData } = await demoAsync.run(['getData'])

    expect(getData).toHaveProperty('req', req)
    expect(getData).toHaveProperty('res', res)
    expect(getData.params).toHaveProperty('id', 1)
    expect(getData.params).toHaveProperty('deps', {})
  })

  test('serial request', async () => {
    class DemoAsync extends SfAsync {
      get deps () {
        return {
          getSize: ['getTag'],
          getData: ['getSize'],
        }
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

    const demoAsync = new DemoAsync(req, res, params)
    const { getData } = await demoAsync.run(['getData'])

    expect(getData).toHaveProperty('size', 'XL')
    expect(getData).toHaveProperty('tag', 'dress')
    expect(getData).toHaveProperty('id', 1)
  })

  test('parallel request', async () => {
    class DemoAsync extends SfAsync {
      get deps () { return {} }
      async getData1 () {
        return 'dress'
      }
      async getData2 () {
        return 'shirt'
      }
      async getData3 () {
        return 'pants'
      }
    }

    const demoAsync = new DemoAsync(req, res, params)
    const { getData1, getData2, getData3 } = await demoAsync.run(['getData1', 'getData2', 'getData3'])

    expect(getData1).toBe('dress')
    expect(getData2).toBe('shirt')
    expect(getData3).toBe('pants')
  })

  test('get deps from runtime', async () => {
    class DemoAsync extends SfAsync {
      get deps () {
        const { isFirstPage } = this.params
        return {
          getData1: isFirstPage ? ['getData2'] : ['getData3'],
        }
      }
      async getData1 (req, res, { deps }) {
        const { getData2, getData3 } = deps
        return { getData2, getData3 }
      }
      async getData2 () {
        return 'data2'
      }
      async getData3 () {
        return 'data3'
      }
    }

    await (async () => {
      const demoAsync = new DemoAsync(req, res, { isFirstPage: true })
      const { getData1 } = await demoAsync.run(['getData1'])

      expect(getData1).toHaveProperty('getData2', 'data2')
      expect(getData1.getData3).toBeUndefined()
    })();

    await (async () => {
      const demoAsync = new DemoAsync(req, res, { isFirstPage: false })
      const { getData1 } = await demoAsync.run(['getData1'])

      expect(getData1.getData2).toBeUndefined()
      expect(getData1).toHaveProperty('getData3', 'data3')
    })();
  })
})
