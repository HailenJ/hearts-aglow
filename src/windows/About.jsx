function About({ aboutParagraphs }) {
  const lead = aboutParagraphs[0]
  const body = aboutParagraphs.slice(1)

  return (
    <div className="about">
      <p className="about__lead">{lead.text}</p>
      <div className="about__text">
        {body.map((p, i) => (
          <p key={i}>
            {p.linkText ? (
              <>
                {'Founded by '}
                <a href={p.linkUrl} target="_blank" rel="noopener noreferrer">
                  {p.linkText}
                </a>
                {', '}
                {p.text}
              </>
            ) : (
              p.text
            )}
          </p>
        ))}
      </div>
    </div>
  )
}

export default About
