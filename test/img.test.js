import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sized } from '../src/lib/img.js'

test('sized asks each CDN for the display size', () => {
  const s = 'https://cdn.sanity.io/images/p/d/abc-1920x1080.png'
  assert.equal(sized(s, 1600), `${s}?w=1600&fit=max&auto=format`)
  const b = 'https://f4.bcbits.com/img/a1_10.jpg'
  assert.equal(sized(b, 100), 'https://f4.bcbits.com/img/a1_3.jpg')
  assert.equal(sized(b, 350), 'https://f4.bcbits.com/img/a1_2.jpg')
  assert.equal(sized(b, 700), 'https://f4.bcbits.com/img/a1_5.jpg')
  assert.equal(sized(b, 1600), b)
  assert.equal(sized('/local.png', 100), '/local.png')
  assert.equal(sized('', 100), '')
  assert.equal(sized(undefined, 100), undefined)
})
