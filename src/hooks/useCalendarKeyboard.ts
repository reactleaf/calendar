import { useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import type { DateValue } from '../core/api.types'

export interface UseCalendarKeyboardOptions {
  enabled?: boolean
  focusedDate: DateValue | null
  setFocusedDate: (date: DateValue | null) => void
  focusNextDay: () => void
  focusPrevDay: () => void
  focusNextWeek: () => void
  focusPrevWeek: () => void
  commitFocusedDate: (source?: 'keyboard') => void
}

export interface UseCalendarKeyboardResult {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

export function useCalendarKeyboard(options: UseCalendarKeyboardOptions): UseCalendarKeyboardResult {
  const {
    enabled = true,
    focusedDate,
    focusNextDay,
    focusPrevDay,
    focusNextWeek,
    focusPrevWeek,
    commitFocusedDate,
  } = options

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!enabled) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          focusPrevDay()
          return
        case 'ArrowRight':
          e.preventDefault()
          focusNextDay()
          return
        case 'ArrowUp':
          e.preventDefault()
          focusPrevWeek()
          return
        case 'ArrowDown':
          e.preventDefault()
          focusNextWeek()
          return
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedDate !== null) commitFocusedDate('keyboard')
          return
        default:
          break
      }
    },
    [commitFocusedDate, enabled, focusNextDay, focusNextWeek, focusPrevDay, focusPrevWeek, focusedDate],
  )

  return { onKeyDown }
}
