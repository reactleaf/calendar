import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { nextSingleSelection } from './single'

describe('nextSingleSelection', () => {
  it('selects clicked value', () => {
    const d = Temporal.PlainDate.from('2024-06-10')
    expect(nextSingleSelection(null, d)).toEqual(d)
  })

  it('deselects when allowDeselect and same day', () => {
    const d = Temporal.PlainDate.from('2024-06-10')
    expect(nextSingleSelection(d, d, { allowDeselect: true })).toBeNull()
  })
})
