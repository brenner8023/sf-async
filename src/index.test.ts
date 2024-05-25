
import { expect, test } from 'vitest'

import SfAsync from '.'

test('SfAsync', async () => {
  const req = { query: {} }
  const res = { locals: {} }
  const params = { id: 1 }

  class DemoAsync extends SfAsync {
    async getData (req, res, params) {
      return { req, res, params }
    }
  }

  const demoAsync = new DemoAsync(req, res, params)
  const { getData } = await demoAsync.run(['getData'])

  expect(getData).toHaveProperty('req', req)
  expect(getData).toHaveProperty('res', res)
  expect(getData.params).toHaveProperty('id', 1)
  expect(getData.params).toHaveProperty('deps', {})
})
