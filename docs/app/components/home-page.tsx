import { docsPath, gitConfig } from '@/lib/shared'
import '@/styles/home-page.css'
import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import { Link } from 'react-router'

export function HomePage() {
  const [date, setDate] = useState<DateValue | null>(null)

  return (
    <main className="home-page">
      <header className="home-page__hero">
        <p className="home-page__kicker">
          A modern rewrite of{' '}
          <a
            className="home-page__kickerLink"
            href="https://github.com/clauderic/react-infinite-calendar"
            target="_blank"
            rel="noreferrer noopener"
          >
            react-infinite-calendar
          </a>
        </p>
        <h1 className="home-page__title">@reactleaf/calendar</h1>
        <p className="home-page__lede">
          Single / multiple / range selection, optional time editing, and Temporal-based dates—built for accessible,
          keyboard-friendly date picking in modern apps.
        </p>
        <nav className="home-page__nav" aria-label="Site">
          <Link className="home-page__navLink home-page__navLink--primary" to={docsPath}>
            Documentation
          </Link>
          <a
            className="home-page__navLink home-page__navLink--secondary"
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg className="home-page__navIcon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.87c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
            GitHub
          </a>
        </nav>
      </header>

      <section className="home-page__demo" aria-labelledby="home-demo-heading">
        <h2 id="home-demo-heading" className="home-page__demoTitle">
          Minimal example
        </h2>
        <pre className="home-page__snippet" tabIndex={0}>
          <code>{`<Calendar mode="single" value={date} onSelect={setDate} />`}</code>
        </pre>
        <div className="home-page__demoCard">
          <Calendar className="home-page__calendar" mode="single" value={date} onSelect={setDate} />
        </div>
        <output className="home-page__output" aria-live="polite">
          <span className="home-page__outputLabel">Selected</span>{' '}
          <span className="home-page__outputValue">{date === null ? '—' : date.toString()}</span>
        </output>
      </section>
    </main>
  )
}
