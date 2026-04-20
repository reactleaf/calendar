import { Temporal } from '@js-temporal/polyfill'

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface MonthGridCell {
  date: Temporal.PlainDate
  inCurrentMonth: boolean
}

/** `weekStartsOn` 0(일)~6(토) 를 Temporal 요일(월=1 … 일=7) 기준 주 시작으로 변환 */
export function weekStartToIsoDay(weekStartsOn: WeekStartsOn): number {
  return weekStartsOn === 0 ? 7 : weekStartsOn
}

export function getMonthGrid(month: Temporal.PlainYearMonth, weekStartsOn: WeekStartsOn = 0): MonthGridCell[][] {
  const ym = Temporal.PlainYearMonth.from(month)
  const firstOfMonth = ym.toPlainDate({ day: 1 })
  const firstIso = firstOfMonth.dayOfWeek
  const weekStartIso = weekStartToIsoDay(weekStartsOn)
  const offset = (firstIso - weekStartIso + 7) % 7

  const gridStart = firstOfMonth.subtract({ days: offset })
  const daysInMonth = ym.daysInMonth
  const totalCells = offset + daysInMonth
  const rowCount = Math.ceil(totalCells / 7)

  const rows: MonthGridCell[][] = []
  let cursor = gridStart

  for (let r = 0; r < rowCount; r += 1) {
    const row: MonthGridCell[] = []
    for (let c = 0; c < 7; c += 1) {
      row.push({
        date: cursor,
        inCurrentMonth: cursor.year === ym.year && cursor.month === ym.month,
      })
      cursor = cursor.add({ days: 1 })
    }
    rows.push(row)
  }

  return rows
}
