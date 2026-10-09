// GoatCounter (index.html) counts page views. These are the actions a page
// view can't see. A no-op until count.js loads, and forever if a blocker
// stops it — analytics must never be able to break a click.
export function track(name) {
  window.goatcounter?.count?.({ path: name, title: name, event: true })
}
