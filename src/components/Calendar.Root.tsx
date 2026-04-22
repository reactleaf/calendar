import { type ReactNode } from 'react'
import type { CalendarMultipleProps, CalendarProps, CalendarRangeProps, CalendarSingleProps } from '../core/api.types'
import { useCalendarMultipleRuntime } from '../hooks/useCalendarMultipleRuntime'
import { useCalendarRangeRuntime } from '../hooks/useCalendarRangeRuntime'
import { useCalendarSingleRuntime } from '../hooks/useCalendarSingleRuntime'
import { CalendarContext } from './Calendar.context'
import type { CalendarRuntime } from './Calendar.types'

interface CalendarRootBaseProps {
  children: ReactNode
}

type CalendarRootProps = CalendarProps & CalendarRootBaseProps

interface CalendarRuntimeRootProps extends CalendarRootBaseProps {
  id?: string
  className?: string
}

function CalendarRuntimeRoot({
  id,
  className,
  children,
  runtime,
}: CalendarRuntimeRootProps & { runtime: CalendarRuntime }) {
  const rootClass = ['calendar', `calendar--mode-${runtime.mode}`, className].filter(Boolean).join(' ')
  return (
    <CalendarContext.Provider value={runtime}>
      <div id={id} className={rootClass}>
        {children}
      </div>
    </CalendarContext.Provider>
  )
}

function CalendarRootSingle(props: CalendarSingleProps & CalendarRootBaseProps) {
  const { id, className, children } = props
  const runtime = useCalendarSingleRuntime(props)
  return (
    <CalendarRuntimeRoot id={id} className={className} runtime={runtime}>
      {children}
    </CalendarRuntimeRoot>
  )
}

function CalendarRootMultiple(props: CalendarMultipleProps & CalendarRootBaseProps) {
  const { id, className, children } = props
  const runtime = useCalendarMultipleRuntime(props)
  return (
    <CalendarRuntimeRoot id={id} className={className} runtime={runtime}>
      {children}
    </CalendarRuntimeRoot>
  )
}

function CalendarRootRange(props: CalendarRangeProps & CalendarRootBaseProps) {
  const { id, className, children } = props
  const runtime = useCalendarRangeRuntime(props)
  return (
    <CalendarRuntimeRoot id={id} className={className} runtime={runtime}>
      {children}
    </CalendarRuntimeRoot>
  )
}

export function CalendarRoot(props: CalendarRootProps) {
  if (props.mode === 'single') return <CalendarRootSingle {...props} />
  if (props.mode === 'multiple') return <CalendarRootMultiple {...props} />
  return <CalendarRootRange {...props} />
}
