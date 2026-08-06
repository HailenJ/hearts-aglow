import test from 'node:test'
import assert from 'node:assert/strict'
import { windowsReducer, initialWindows, focusedId, openIds } from '../src/lib/windows.js'

const run = (actions, start = initialWindows) => actions.reduce(windowsReducer, start)

test('starts with nothing open', () => {
  assert.equal(focusedId(initialWindows), null)
  assert.deepEqual(openIds(initialWindows), [])
})

test('OPEN opens and focuses', () => {
  const s = run([{ type: 'OPEN', id: 'works' }])
  assert.equal(s.works.open, true)
  assert.equal(focusedId(s), 'works')
})

test('opening a second window focuses it and raises it above the first', () => {
  const s = run([{ type: 'OPEN', id: 'about' }, { type: 'OPEN', id: 'works' }])
  assert.equal(focusedId(s), 'works')
  assert.ok(s.works.z > s.about.z)
  assert.deepEqual(openIds(s), ['about', 'works'])
})

test('FOCUS raises an already-open window above the others', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'OPEN', id: 'works' },
    { type: 'FOCUS', id: 'about' },
  ])
  assert.equal(focusedId(s), 'about')
  assert.ok(s.about.z > s.works.z)
})

test('TOGGLE opens a closed window and closes an open one', () => {
  const opened = run([{ type: 'TOGGLE', id: 'game' }])
  assert.equal(opened.game.open, true)
  const closed = windowsReducer(opened, { type: 'TOGGLE', id: 'game' })
  assert.equal(closed.game.open, false)
})

test('TOGGLE on a minimized window restores it rather than closing it', () => {
  const s = run([
    { type: 'OPEN', id: 'works' },
    { type: 'MINIMIZE', id: 'works' },
    { type: 'TOGGLE', id: 'works' },
  ])
  assert.equal(s.works.open, true)
  assert.equal(s.works.minimized, false)
  assert.equal(focusedId(s), 'works')
})

test('MINIMIZE keeps the window open but removes it from focus', () => {
  const s = run([{ type: 'OPEN', id: 'works' }, { type: 'MINIMIZE', id: 'works' }])
  assert.equal(s.works.open, true)
  assert.equal(s.works.minimized, true)
  assert.equal(focusedId(s), null)
})

test('closing the focused window falls back to the next-highest open window', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'OPEN', id: 'works' },
    { type: 'CLOSE', id: 'works' },
  ])
  assert.equal(focusedId(s), 'about')
})

test('CLOSE forgets maximize but keeps geometry for reopening', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'MOVE', id: 'about', x: 120, y: 90 },
    { type: 'MAXIMIZE', id: 'about' },
    { type: 'CLOSE', id: 'about' },
  ])
  assert.equal(s.about.maximized, false)
  assert.equal(s.about.x, 120)
  assert.equal(s.about.y, 90)
})

test('MAXIMIZE toggles', () => {
  const s = run([{ type: 'OPEN', id: 'works' }, { type: 'MAXIMIZE', id: 'works' }])
  assert.equal(s.works.maximized, true)
  assert.equal(windowsReducer(s, { type: 'MAXIMIZE', id: 'works' }).works.maximized, false)
})

test('MOVE and RESIZE record geometry', () => {
  const s = run([
    { type: 'OPEN', id: 'connect' },
    { type: 'MOVE', id: 'connect', x: 40, y: 60 },
    { type: 'RESIZE', id: 'connect', w: 500, h: 400 },
  ])
  assert.equal(s.connect.x, 40)
  assert.equal(s.connect.y, 60)
  assert.equal(s.connect.w, 500)
  assert.equal(s.connect.h, 400)
})

test('FOCUS on the already-topmost window returns the identical state object', () => {
  const s1 = run([{ type: 'OPEN', id: 'about' }])
  const s2 = windowsReducer(s1, { type: 'FOCUS', id: 'about' })
  assert.equal(s2, s1)
})

test('OPEN on an already-open, already-topmost window returns the identical state object', () => {
  const s1 = run([{ type: 'OPEN', id: 'works' }])
  const s2 = windowsReducer(s1, { type: 'OPEN', id: 'works' })
  assert.equal(s2, s1)
})

test('MINIMIZE on a never-opened window leaves state unchanged', () => {
  const s = windowsReducer(initialWindows, { type: 'MINIMIZE', id: 'game' })
  assert.equal(s, initialWindows)
})

test('MAXIMIZE on a closed window leaves state unchanged', () => {
  const s = windowsReducer(initialWindows, { type: 'MAXIMIZE', id: 'connect' })
  assert.equal(s, initialWindows)
})

test('MAXIMIZE on a closed window does not affect reopening', () => {
  const s1 = windowsReducer(initialWindows, { type: 'MAXIMIZE', id: 'about' })
  const s2 = windowsReducer(s1, { type: 'OPEN', id: 'about' })
  assert.equal(s2.about.maximized, false)
})

test('MOVE on a closed window leaves state unchanged', () => {
  const s = windowsReducer(initialWindows, { type: 'MOVE', id: 'works', x: 100, y: 100 })
  assert.equal(s, initialWindows)
})

test('RESIZE on a closed window leaves state unchanged', () => {
  const s = windowsReducer(initialWindows, { type: 'RESIZE', id: 'connect', w: 500, h: 400 })
  assert.equal(s, initialWindows)
})

test('an unknown id is ignored rather than throwing', () => {
  const s = windowsReducer(initialWindows, { type: 'OPEN', id: 'nope' })
  assert.equal(s, initialWindows)
})

test('an unknown action type is ignored', () => {
  const s = windowsReducer(initialWindows, { type: 'WAT', id: 'about' })
  assert.equal(s, initialWindows)
})
