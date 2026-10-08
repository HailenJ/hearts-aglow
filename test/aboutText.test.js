import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { aboutParagraphs } from '../src/data/fallback.js'

// About paragraphs are one editable string each, with `{link}` marking where
// the link goes. The failure mode this guards: link data on a paragraph whose
// text has no token, which renders the link nowhere and loses it silently —
// exactly what happened when the words around the link were hardcoded in JSX.

test('every about paragraph carrying link data has somewhere to put it', () => {
  for (const p of aboutParagraphs) {
    if (!p.linkText && !p.linkUrl) continue
    assert.ok(p.linkText && p.linkUrl, `paragraph "${p.text}" has half a link`)
    assert.ok(p.text.includes('{link}'), `paragraph "${p.text}" has a link but no {link} token`)
  }
})

test('about text is fetched from Sanity, not fallback-only', () => {
  const queries = readFileSync(new URL('../src/lib/queries.js', import.meta.url), 'utf8')
  assert.match(queries, /"aboutParagraphs":\s*\*\[_type == "about"\]/)
  assert.match(queries, /data\.aboutParagraphs = result\.aboutParagraphs/)
})

test('a paragraph with null fields from Sanity renders instead of throwing', async () => {
  const { splitParagraph } = await import('../src/lib/about.js')
  assert.equal(splitParagraph({ text: null, linkText: null, linkUrl: null }), '')
  assert.equal(splitParagraph(null), '')
  assert.equal(splitParagraph({ text: 'see {link} here', linkText: 'it', linkUrl: null }), 'see it here')
  assert.deepEqual(
    splitParagraph({ text: 'see {link} here', linkText: 'it', linkUrl: 'https://x' }),
    ['see ', { text: 'it', url: 'https://x' }, ' here'],
  )
})
