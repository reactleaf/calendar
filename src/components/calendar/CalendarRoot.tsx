import type { ReactNode } from 'react'
import type { CalendarSingleProps } from '../../core/api.types'
import { CalendarContext } from './context'
import { useCalendarSingleRuntime } from './useCalendarSingleRuntime'

interface CalendarRootProps extends CalendarSingleProps {
  children: ReactNode
}

export function CalendarRoot(props: CalendarRootProps) {
  const { id, className, mode, children } = props
  if (mode !== 'single') {
    throw new Error('Calendar.Root currently supports only mode="single".')
  }

  const runtime = useCalendarSingleRuntime(props)
  const rootClass = ['calendar', className].filter(Boolean).join(' ')

  return (
    <CalendarContext.Provider value={runtime}>
      <div id={id} className={rootClass}>
        {children}
      </div>
    </CalendarContext.Provider>
  )
}
