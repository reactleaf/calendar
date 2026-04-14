import { createContext, useContext } from 'react'
import type { CalendarRuntime } from './types'

export const CalendarContext = createContext<CalendarRuntime | null>(null)

export function useCalendarContext(): CalendarRuntime {
  const ctx = useContext(CalendarContext)
  if (!ctx) {
    throw new Error('Calendar compound component must be used within Calendar.Root')
  }
  return ctx
}
