import { docsPath } from '@/lib/shared'
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
          Virtualized month list, single / multiple / range selection, optional time editing, and Temporal-based
          dates—built for accessible, keyboard-friendly date picking in modern apps.
        </p>
        <nav className="home-page__nav" aria-label="Site">
          <Link className="home-page__navLink home-page__navLink--primary" to={docsPath}>
            Documentation
          </Link>
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
