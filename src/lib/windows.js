export const WINDOW_IDS = ['about', 'works', 'game', 'connect']

const blank = { open: false, minimized: false, maximized: false, x: null, y: null, w: null, h: null, z: 0 }

export const initialWindows = Object.fromEntries(WINDOW_IDS.map(id => [id, { ...blank }]))

const topZ = state => Math.max(0, ...Object.values(state).map(w => w.z))

const patch = (state, id, next) => ({ ...state, [id]: { ...state[id], ...next } })

const raise = (state, id) => patch(state, id, { z: topZ(state) + 1 })

export function windowsReducer(state, action) {
  const { type, id } = action
  if (!Object.prototype.hasOwnProperty.call(state, id)) return state

  switch (type) {
    case 'OPEN':
      return raise(patch(state, id, { open: true, minimized: false }), id)

    case 'TOGGLE':
      // A minimized window restores rather than closing — the dock item is
      // the same control for both, and closing it would lose the user's place.
      if (state[id].open && state[id].minimized) {
        return raise(patch(state, id, { minimized: false }), id)
      }
      if (state[id].open) return patch(state, id, { open: false, maximized: false })
      return raise(patch(state, id, { open: true, minimized: false }), id)

    case 'CLOSE':
      return patch(state, id, { open: false, maximized: false })

    case 'FOCUS':
      if (!state[id].open || state[id].minimized) return state
      return raise(state, id)

    case 'MINIMIZE':
      return patch(state, id, { minimized: true })

    case 'MAXIMIZE':
      return patch(state, id, { maximized: !state[id].maximized })

    case 'MOVE':
      return patch(state, id, { x: action.x, y: action.y, maximized: false })

    case 'RESIZE':
      return patch(state, id, { w: action.w, h: action.h, maximized: false })

    default:
      return state
  }
}

export function focusedId(state) {
  const live = Object.entries(state).filter(([, w]) => w.open && !w.minimized)
  if (live.length === 0) return null
  return live.reduce((a, b) => (b[1].z > a[1].z ? b : a))[0]
}

export function openIds(state) {
  return Object.entries(state)
    .filter(([, w]) => w.open)
    .sort((a, b) => a[1].z - b[1].z)
    .map(([id]) => id)
}
