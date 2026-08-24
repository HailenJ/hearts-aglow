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
