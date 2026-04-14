import { createContext, useContext } from 'react'
import type { SingleModeRuntime } from './types'

export const CalendarContext = createContext<SingleModeRuntime | null>(null)

export function useCalendarContext(): SingleModeRuntime {
  const ctx = useContext(CalendarContext)
  if (!ctx) {
    throw new Error('Calendar compound component must be used within Calendar.Root')
  }
  return ctx
}
