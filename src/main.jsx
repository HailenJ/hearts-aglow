import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Self-hosted, weight axis only — the same instances Google served, so
// `font-stretch` still has no width axis to act on. Each file carries
// unicode-range subsets, so a Latin page fetches only the Latin slice.
import '@fontsource-variable/anybody'
import '@fontsource-variable/archivo'
import '@fontsource-variable/archivo/wght-italic.css'
import '@fontsource-variable/martian-mono'
import './styles/globals.css'

// Images arrive hidden and fade in once decoded, rather than painting in
// strips over the glass. `load` doesn't bubble, so listen in the capture
// phase — one listener for every <img>, present and future. A failed image
// stays hidden: an empty frame reads better than a broken-image glyph.
document.addEventListener('load', e => {
  if (e.target.tagName === 'IMG') e.target.dataset.loaded = ''
}, true)

// This is the entry point - it mounts our App component to the DOM
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
