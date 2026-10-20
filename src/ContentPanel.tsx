import { useEffect, useRef, useState, type RefObject } from 'react'
import { education, profile, publications, sections, work, type Section } from './content'
import { ArrowIcon } from './Icons'
import ProjectIllustration from './ProjectIllustration'
import type { Mode } from './useNavigation'

type Props = {
  visible: Section | null
  mode: Mode
  close: () => void
  select: (section: Section, origin?: HTMLElement | null) => void
  focusRequested: RefObject<boolean>
}

const headings: Record<Section, string> = {
  publications: 'Research, in practice.',
  education: 'Where it started.',
  work: 'What I bring back.',
}

export default function ContentPanel({ visible, mode, close, select, focusRequested }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // Retain the last section while the drawer closes, but make it inert immediately.
  const [content, setContent] = useState(visible)
  if (visible && content !== visible) setContent(visible)
  useEffect(() => {
    if (visible && scroller.current) scroller.current.scrollTop = 0
    if (visible && focusRequested.current) {
      heading.current?.focus({ preventScroll: true })
      focusRequested.current = false
      if (window.matchMedia('(max-width: 760px)').matches)
        heading.current?.closest('section')?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        })
    }
  }, [visible, focusRequested])

  return (
    <aside
      className={`reading-panel ${visible ? 'is-open' : ''}`}
      id="workbench-info"
      aria-label="Workbench content"
      aria-hidden={!visible}
      inert={!visible}
      aria-busy={mode === 'reaching'}
    >
      <div className="panel-scroll" ref={scroller}>
        {content && (
          <section className="panel-content" key={content} aria-labelledby="section-heading">
            <div className="panel-topline">
              <span className="eyebrow">
                {sections.find((section) => section.id === content)?.object}
              </span>
              <button className="close-button" onClick={close} aria-label="Close section">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <h2 id="section-heading" ref={heading} tabIndex={-1}>
              {headings[content]}
            </h2>
            {content === 'publications' && (
              <>
                <p>
                  Two first-author papers on how robots move, manipulate, and explore. The research
                  I’m building on as I return to robotics.
                </p>
                <div className="publication-list">
                  {publications.map((paper) => (
                    <article className="publication-card" key={paper.title}>
                      <div className="publication-art" aria-hidden="true">
                        <ProjectIllustration kind={paper.illustration} />
                        <span>ILLUSTRATION</span>
                      </div>
                      <div className="publication-copy">
                        <div className="paper-meta">
                          <span className="eyebrow">
                            {paper.venue} · {paper.year}
                          </span>
                          <span className="author-badge">{paper.authorship}</span>
                        </div>
                        <h3>{paper.title}</h3>
                        <p className="paper-context">{paper.context}</p>
                        <p>{paper.summary}</p>
                        <div className="tags">
                          {paper.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <a className="paper-link" href={paper.url} target="_blank" rel="noreferrer">
                          {paper.linkLabel}
                          <ArrowIcon diagonal />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            {content === 'education' && (
              <>
                <p className="panel-lead">
                  Robotics has been the thread from my engineering studies to my PhD research.
                </p>
                <p>
                  I studied mechanical engineering and robotics at EPFL, then joined BioRob to work
                  on self-reconfigurable modular robots.
                </p>
                <div className="education-list">
                  {education.map((item) => (
                    <article
                      className={`education-card ${item.featured ? 'featured' : ''}`}
                      key={item.degree}
                    >
                      <span className="eyebrow">
                        {item.dates} / {item.school}
                      </span>
                      <h3>{item.degree}</h3>
                      <p>{item.detail}</p>
                      {item.note && <p className="education-note">{item.note}</p>}
                    </article>
                  ))}
                </div>
                <div className="about-note">
                  <span className="eyebrow">THE QUESTIONS I COME BACK TO</span>
                  <ul>
                    {profile.focus.map((focus) => (
                      <li key={focus}>{focus}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className="text-button"
                  onClick={(event) => select('publications', event.currentTarget)}
                >
                  Read the publications
                  <ArrowIcon />
                </button>
              </>
            )}
            {content === 'work' && (
              <>
                <p className="panel-lead">Co-founder & CTO of Typeless, acquired by Doctolib.</p>
                <p>
                  We built Typeless from the first prototype to paid pilots, then sold the company
                  to Doctolib in May 2024. I’m bringing that experience building and shipping AI
                  systems back to robotics.
                </p>
                <div className="work-list">
                  {work.map((item) => (
                    <article className="work-entry" key={item.organization}>
                      <span className="eyebrow">{item.dates}</span>
                      <h3>{item.organization}</h3>
                      <p className="work-role">{item.role}</p>
                      <p>{item.description}</p>
                      <p className="work-context">{item.context}</p>
                      <div className="tags">
                        {item.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="background-section">
                  <h3 className="eyebrow">IN THE TOOLKIT</h3>
                  <div className="tags">
                    {profile.tools.map((tool) => (
                      <span key={tool}>{tool}</span>
                    ))}
                  </div>
                </div>
                <button
                  className="text-button"
                  onClick={(event) => select('publications', event.currentTarget)}
                >
                  Back to the robotics research
                  <ArrowIcon />
                </button>
              </>
            )}
            <div className="panel-end">
              <span className="tiny-cross">+</span>
              <span>From the workbench</span>
              <span className="tiny-cross">+</span>
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}
