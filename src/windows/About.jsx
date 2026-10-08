import { splitParagraph } from '../lib/about'

function renderParagraph(p) {
  const parts = splitParagraph(p)
  if (typeof parts === 'string') return parts
  const [before, link, after] = parts
  return (
    <>
      {before}
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        {link.text}
      </a>
      {after}
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
