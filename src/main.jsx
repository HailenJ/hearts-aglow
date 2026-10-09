import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
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
