import { Temporal } from '@js-temporal/polyfill'
import React, { Profiler, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Calendar } from '../src/Calendar'
import '../src/Calendar.css'

import type { CalendarRangeValue } from '../src/core/api.types'

declare global {
  interface Window {
    __calendarPerf?: {
      ready: boolean
      monthChanges: number
      profilerCommits: number
      profilerActualDurationMs: number
      profilerMaxActualDurationMs: number
    }
  }
}

const initialRange: CalendarRangeValue = { start: null, end: null }

function PerfApp() {
  const [range, setRange] = useState<CalendarRangeValue>(initialRange)

  useEffect(() => {
    if (window.__calendarPerf) window.__calendarPerf.ready = true
  }, [])

  return (
    <main className="perf-page">
      <Profiler
        id="Calendar"
        onRender={(_id, _phase, actualDuration) => {
          const perf = window.__calendarPerf
          if (!perf) return
          perf.profilerCommits += 1
          perf.profilerActualDurationMs += actualDuration
          perf.profilerMaxActualDurationMs = Math.max(perf.profilerMaxActualDurationMs, actualDuration)
        }}
      >
        <Calendar
          mode="range"
          value={range}
          onSelect={setRange}
          onMonthChange={() => {
            const perf = window.__calendarPerf
            if (perf) perf.monthChanges += 1
          }}
          minDate={Temporal.PlainDate.from('2020-01-01')}
          maxDate={Temporal.PlainDate.from('2035-12-31')}
        />
      </Profiler>
    </main>
  )
}

window.__calendarPerf = {
  ready: false,
  monthChanges: 0,
  profilerCommits: 0,
  profilerActualDurationMs: 0,
  profilerMaxActualDurationMs: 0,
}

const style = document.createElement('style')
style.textContent = `
  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #f4f7fb;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .perf-page {
    width: 420px;
  }
`
document.head.append(style)

createRoot(document.getElementById('root') as HTMLElement).render(<PerfApp />)
