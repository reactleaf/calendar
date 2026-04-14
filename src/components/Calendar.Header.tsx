import type { ReactNode } from 'react'

interface CalendarHeaderProps {
  className?: string
  children?: ReactNode
}

export function CalendarHeader({ className, children }: CalendarHeaderProps) {
  if (!children) return null
  const classes = ['calendar__header', className].filter(Boolean).join(' ')
  return <div className={classes}>{children}</div>
}
