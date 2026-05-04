import '@/styles/doc-example.css'
import { Temporal } from '@js-temporal/polyfill'
import type { CalendarFormatters, DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { ModalManager, ModalProvider, useModalInstance, type ModalComponent } from '@reactleaf/modal'
import '@reactleaf/modal/style.css'
import { CalendarDays, Check, RotateCcw, X } from 'lucide-react'
import { useId, useState } from 'react'

type ParseResult =
  | { status: 'empty'; date: null }
  | { status: 'pending'; date: null }
  | { status: 'valid'; date: Temporal.PlainDate }
  | { status: 'invalid'; date: null; message: string }

type DateTimeParseResult =
  | { status: 'empty'; dateTime: null }
  | { status: 'pending'; dateTime: null }
  | { status: 'valid'; dateTime: Temporal.PlainDateTime }
  | { status: 'invalid'; dateTime: null; message: string }

type DatePickerModalProps = {
  initialDate: Temporal.PlainDate | null
}

type DateTimePickerModalProps = {
  initialDateTime: Temporal.PlainDateTime | null
}

const modal = new ModalManager()
const DEFAULT_DATE = Temporal.PlainDate.from('2026-04-15')
const DEFAULT_DATE_TIME = Temporal.PlainDateTime.from('2026-04-15T09:30')
const TODAY = Temporal.Now.plainDateISO()

const modalCalendarFormatters: CalendarFormatters = {
  monthYear: (month) => `${month.monthCode.replace('M', '')} / ${month.year}`,
  monthDate: (date) => `${date.month}/${date.day}`,
  todayLabel: () => 'Today',
}

function formatDate(date: Temporal.PlainDate | null) {
  return date === null ? '' : date.toString()
}

function formatDateTime(dateTime: Temporal.PlainDateTime | null) {
  if (dateTime === null) return ''
  const hour = String(dateTime.hour).padStart(2, '0')
  const minute = String(dateTime.minute).padStart(2, '0')

  return `${dateTime.toPlainDate().toString()} ${hour}:${minute}`
}

function parseDateInput(value: string): ParseResult {
  const trimmed = value.trim()
  if (trimmed.length === 0) return { status: 'empty', date: null }

  const match = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(trimmed)
  if (!match) {
    return trimmed.length < 8
      ? { status: 'pending', date: null }
      : { status: 'invalid', date: null, message: 'Use YYYY-MM-DD, YYYY.MM.DD, or YYYY/MM/DD.' }
  }

  const [, year, month, day] = match

  try {
    return {
      status: 'valid',
      date: Temporal.PlainDate.from({
        year: Number(year),
        month: Number(month),
        day: Number(day),
      }),
    }
  } catch {
    return { status: 'invalid', date: null, message: 'Enter a valid calendar date.' }
  }
}

function parseDateTimeInput(value: string): DateTimeParseResult {
  const trimmed = value.trim()
  if (trimmed.length === 0) return { status: 'empty', dateTime: null }

  const match = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})[T\s](\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) {
    return trimmed.length < 12
      ? { status: 'pending', dateTime: null }
      : { status: 'invalid', dateTime: null, message: 'Use YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm.' }
  }

  const [, year, month, day, hour, minute] = match
  const hourValue = Number(hour)
  const minuteValue = Number(minute)

  if (hourValue > 23 || minuteValue > 59) {
    return { status: 'invalid', dateTime: null, message: 'Enter a valid time from 00:00 to 23:59.' }
  }

  try {
    return {
      status: 'valid',
      dateTime: Temporal.PlainDateTime.from({
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: hourValue,
        minute: minuteValue,
      }),
    }
  } catch {
    return { status: 'invalid', dateTime: null, message: 'Enter a valid calendar date and time.' }
  }
}

function toPlainDate(value: DateValue) {
  return value instanceof Temporal.PlainDateTime ? value.toPlainDate() : value
}

function toPlainDateTime(value: DateValue, fallbackTime: Temporal.PlainDateTime) {
  if (value instanceof Temporal.PlainDateTime) return value

  return value.toPlainDateTime(Temporal.PlainTime.from({ hour: fallbackTime.hour, minute: fallbackTime.minute }))
}

const DatePickerModal: ModalComponent<DatePickerModalProps> = ({ initialDate }) => {
  const { visible, closeSelf } = useModalInstance()
  const [draftDate, setDraftDate] = useState<Temporal.PlainDate>(initialDate ?? TODAY)

  return (
    <section
      className={visible ? 'doc-modal-input__dialog is-visible' : 'doc-modal-input__dialog'}
      aria-label="Choose date"
    >
      <header className="doc-modal-input__dialogHeader">
        <div>
          <p className="doc-modal-input__eyebrow">Calendar picker</p>
          <h3>Choose a date</h3>
        </div>
        <button
          className="doc-modal-input__iconButton"
          type="button"
          aria-label="Close"
          onClick={() => void closeSelf()}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="doc-modal-input__calendarShell">
        <Calendar
          className="doc-modal-input__calendar"
          mode="single"
          value={draftDate}
          onSelect={(nextDate) => {
            if (nextDate !== null) setDraftDate(toPlainDate(nextDate))
          }}
          formatters={modalCalendarFormatters}
        />
      </div>

      <footer className="doc-modal-input__dialogFooter">
        <button className="doc-modal-input__ghostButton" type="button" onClick={() => void closeSelf(null)}>
          Clear
        </button>
        <button
          className="doc-modal-input__ghostButton"
          type="button"
          onClick={() => {
            setDraftDate(TODAY)
          }}
        >
          <RotateCcw aria-hidden="true" size={16} />
          Today
        </button>
        <button className="doc-modal-input__primaryButton" type="button" onClick={() => void closeSelf(draftDate)}>
          <Check aria-hidden="true" size={16} />
          Apply {draftDate.toString()}
        </button>
      </footer>
    </section>
  )
}

const DateTimePickerModal: ModalComponent<DateTimePickerModalProps> = ({ initialDateTime }) => {
  const { visible, closeSelf } = useModalInstance()
  const [draftDateTime, setDraftDateTime] = useState<Temporal.PlainDateTime>(initialDateTime ?? DEFAULT_DATE_TIME)

  return (
    <section
      className={visible ? 'doc-modal-input__dialog is-visible' : 'doc-modal-input__dialog'}
      aria-label="Choose date and time"
    >
      <header className="doc-modal-input__dialogHeader">
        <div>
          <p className="doc-modal-input__eyebrow">Calendar picker</p>
          <h3>Choose a date and time</h3>
        </div>
        <button
          className="doc-modal-input__iconButton"
          type="button"
          aria-label="Close"
          onClick={() => void closeSelf()}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="doc-modal-input__calendarShell">
        <Calendar
          className="doc-modal-input__calendar"
          mode="single"
          includeTime
          value={draftDateTime}
          onSelect={(nextDateTime) => {
            if (nextDateTime !== null) {
              setDraftDateTime((current) => toPlainDateTime(nextDateTime, current))
            }
          }}
          formatters={modalCalendarFormatters}
        />
      </div>

      <footer className="doc-modal-input__dialogFooter">
        <button className="doc-modal-input__ghostButton" type="button" onClick={() => void closeSelf(null)}>
          Clear
        </button>
        <button
          className="doc-modal-input__ghostButton"
          type="button"
          onClick={() => {
            setDraftDateTime(DEFAULT_DATE_TIME)
          }}
        >
          <RotateCcw aria-hidden="true" size={16} />
          Reset
        </button>
        <button className="doc-modal-input__primaryButton" type="button" onClick={() => void closeSelf(draftDateTime)}>
          <Check aria-hidden="true" size={16} />
          Apply {formatDateTime(draftDateTime)}
        </button>
      </footer>
    </section>
  )
}

export function ModalInputExample() {
  const fieldId = useId()
  const dateTimeFieldId = useId()
  const [date, setDate] = useState<Temporal.PlainDate | null>(DEFAULT_DATE)
  const [inputValue, setInputValue] = useState(formatDate(DEFAULT_DATE))
  const [inputError, setInputError] = useState<string | null>(null)
  const [dateTime, setDateTime] = useState<Temporal.PlainDateTime | null>(DEFAULT_DATE_TIME)
  const [dateTimeInputValue, setDateTimeInputValue] = useState(formatDateTime(DEFAULT_DATE_TIME))
  const [dateTimeInputError, setDateTimeInputError] = useState<string | null>(null)

  function applyDate(nextDate: Temporal.PlainDate | null) {
    setDate(nextDate)
    setInputValue(formatDate(nextDate))
    setInputError(null)
  }

  function applyDateTime(nextDateTime: Temporal.PlainDateTime | null) {
    setDateTime(nextDateTime)
    setDateTimeInputValue(formatDateTime(nextDateTime))
    setDateTimeInputError(null)
  }

  function validateAndApply(nextValue: string, showPendingError = false) {
    const parsed = parseDateInput(nextValue)

    if (parsed.status === 'empty') {
      applyDate(null)
      return
    }

    if (parsed.status === 'valid') {
      applyDate(parsed.date)
      return
    }

    if (parsed.status === 'invalid' || showPendingError) {
      setInputError(parsed.status === 'invalid' ? parsed.message : 'Finish the date as YYYY-MM-DD.')
    } else {
      setInputError(null)
    }
  }

  function validateAndApplyDateTime(nextValue: string, showPendingError = false) {
    const parsed = parseDateTimeInput(nextValue)

    if (parsed.status === 'empty') {
      applyDateTime(null)
      return
    }

    if (parsed.status === 'valid') {
      applyDateTime(parsed.dateTime)
      return
    }

    if (parsed.status === 'invalid' || showPendingError) {
      setDateTimeInputError(
        parsed.status === 'invalid' ? parsed.message : 'Finish the date and time as YYYY-MM-DD HH:mm.',
      )
    } else {
      setDateTimeInputError(null)
    }
  }

  async function openCalendar() {
    const nextDate = await modal.open<DatePickerModalProps, Temporal.PlainDate | null>(
      DatePickerModal,
      { initialDate: date },
      {
        className: 'doc-modal-input__overlay',
        closeDelay: 180,
        closeOnOutsideClick: true,
        dim: true,
      },
    )

    if (nextDate === null || nextDate instanceof Temporal.PlainDate) applyDate(nextDate)
  }

  async function openDateTimeCalendar() {
    const nextDateTime = await modal.open<DateTimePickerModalProps, Temporal.PlainDateTime | null>(
      DateTimePickerModal,
      { initialDateTime: dateTime },
      {
        className: 'doc-modal-input__overlay',
        closeDelay: 180,
        closeOnOutsideClick: true,
        dim: true,
      },
    )

    if (nextDateTime === null || nextDateTime instanceof Temporal.PlainDateTime) applyDateTime(nextDateTime)
  }

  return (
    <ModalProvider manager={modal} defaultLayerOptions={{ closeDelay: 180, closeOnOutsideClick: true, dim: true }}>
      <div className="doc-example doc-modal-input not-prose">
        <div className="doc-modal-input__panel">
          <label className="doc-modal-input__label" htmlFor={fieldId}>
            Appointment date
          </label>
          <div className={inputError === null ? 'doc-modal-input__field' : 'doc-modal-input__field has-error'}>
            <input
              id={fieldId}
              type="text"
              inputMode="numeric"
              value={inputValue}
              placeholder="YYYY-MM-DD"
              aria-invalid={inputError !== null}
              aria-describedby={`${fieldId}-hint`}
              onBlur={() => {
                validateAndApply(inputValue, true)
              }}
              onChange={(event) => {
                const nextValue = event.currentTarget.value
                setInputValue(nextValue)
                validateAndApply(nextValue)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') validateAndApply(event.currentTarget.value, true)
              }}
            />
            <button className="doc-modal-input__calendarButton" type="button" onClick={() => void openCalendar()}>
              <CalendarDays aria-hidden="true" size={17} />
              Calendar
            </button>
          </div>
          <p
            id={`${fieldId}-hint`}
            className={inputError === null ? 'doc-modal-input__hint' : 'doc-modal-input__hint has-error'}
          >
            {inputError ?? 'Type a date directly or open the modal calendar.'}
          </p>
        </div>

        <div className="doc-modal-input__panel">
          <label className="doc-modal-input__label" htmlFor={dateTimeFieldId}>
            Appointment date and time
          </label>
          <div className={dateTimeInputError === null ? 'doc-modal-input__field' : 'doc-modal-input__field has-error'}>
            <input
              id={dateTimeFieldId}
              type="text"
              inputMode="numeric"
              value={dateTimeInputValue}
              placeholder="YYYY-MM-DD HH:mm"
              aria-invalid={dateTimeInputError !== null}
              aria-describedby={`${dateTimeFieldId}-hint`}
              onBlur={() => {
                validateAndApplyDateTime(dateTimeInputValue, true)
              }}
              onChange={(event) => {
                const nextValue = event.currentTarget.value
                setDateTimeInputValue(nextValue)
                validateAndApplyDateTime(nextValue)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') validateAndApplyDateTime(event.currentTarget.value, true)
              }}
            />
            <button
              className="doc-modal-input__calendarButton"
              type="button"
              onClick={() => void openDateTimeCalendar()}
            >
              <CalendarDays aria-hidden="true" size={17} />
              Calendar + time
            </button>
          </div>
          <p
            id={`${dateTimeFieldId}-hint`}
            className={dateTimeInputError === null ? 'doc-modal-input__hint' : 'doc-modal-input__hint has-error'}
          >
            {dateTimeInputError ?? 'Type a date and time directly or open the includeTime modal calendar.'}
          </p>
        </div>
      </div>
    </ModalProvider>
  )
}
