import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The phone layout is decided twice: COMPACT in JS (which affordances mount)
// and @media in CSS (how they lay out). If the copies disagree, a landscape
// phone gets phone JS with desktop CSS, or the reverse.
test('every compact @media in globals.css matches COMPACT', () => {
  const js = readFileSync(new URL('../src/hooks/useMediaQuery.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')
  const compact = js.match(/export const COMPACT = '([^']+)'/)[1]
  const queries = [...css.matchAll(/@media ([^{]*max-width[^{]*)\{/g)].map(m => m[1].trim())
  assert.ok(queries.length >= 3)
  for (const q of queries) assert.equal(q, compact)
})
