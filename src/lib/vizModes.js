// Kept out of Visualizer.jsx so that file exports only its component —
// React Fast Refresh requires it, and a shared constant belongs in lib anyway.
//
// Named for what each one looks like, not for who inspired it. The debts are
// still Belson and Minter's and they are paid in the comments where the maths
// lives; a mode picker is not a credits roll.
export const VIZ_MODES = [
  { id: 'strand', label: 'Strand' },
  { id: 'halo', label: 'Halo' },
  { id: 'bloom', label: 'Bloom' },
]

export const DEFAULT_MODE = 'strand'

export const isMode = (id) => VIZ_MODES.some(m => m.id === id)
