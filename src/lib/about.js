// A paragraph is one editable string from Sanity. `{link}` marks where the
// link goes, so every word — including the words around the link — is
// editable in the CMS. Returns plain text, or [before, link, after] when
// there is a link to render.
//
// Sanity sends null, not undefined, for an empty field — a destructuring
// default would not catch it, and null.split took the whole site down.
// Link text with no URL renders as words, not as an <a> nobody can click.
export function splitParagraph(p) {
  const text = p?.text ?? ''
  const { linkText, linkUrl } = p ?? {}
  const [before, ...rest] = text.split('{link}')
  if (!rest.length || !linkText) return text.replace('{link}', '')
  if (!linkUrl) return text.replace('{link}', linkText)
  return [before, { text: linkText, url: linkUrl }, rest.join('{link}')]
}
