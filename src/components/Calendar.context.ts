import { createContext, useContext } from 'react'
import type { RefObject } from 'react'
import type { CalendarRuntime, CalendarViewportHandle } from './Calendar.types'

export const CalendarContext = createContext<CalendarRuntime | null>(null)
export const CalendarViewportHandleContext = createContext<RefObject<CalendarViewportHandle | null> | null>(null)

export function useCalendarContext(): CalendarRuntime {
  const ctx = useContext(CalendarContext)
  if (!ctx) {
    throw new Error('Calendar compound component must be used within Calendar.Root')
  }
  return ctx
}

export function useCalendarViewportHandle(): RefObject<CalendarViewportHandle | null> {
  const ctx = useContext(CalendarViewportHandleContext)
  if (!ctx) {
    throw new Error('Calendar viewport handle must be used within Calendar.Root')
  }
  return ctx
}
