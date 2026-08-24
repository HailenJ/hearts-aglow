// A paragraph is one editable string from Sanity. `{link}` marks where the
// link goes, so every word — including the words around the link — is
// editable in the CMS. No token, or no link text, renders as plain prose.
function renderParagraph({ text = '', linkText, linkUrl }) {
  const [before, ...rest] = text.split('{link}')
  if (!rest.length || !linkText) return text.replace('{link}', '')
  return (
    <>
      {before}
      <a href={linkUrl} target="_blank" rel="noopener noreferrer">
        {linkText}
      </a>
      {rest.join('{link}')}
    </>
  )
}

function About({ aboutParagraphs }) {
  const [lead, ...body] = aboutParagraphs

  return (
    <div className="about">
      <p className="about__lead">{renderParagraph(lead)}</p>
      <div className="about__text">
        {body.map((p, i) => (
          <p key={i}>{renderParagraph(p)}</p>
        ))}
      </div>
    </div>
  )
}

export default About
