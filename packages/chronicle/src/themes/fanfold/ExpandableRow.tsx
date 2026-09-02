'use client'

import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface ExpandableRowProps {
  /** The row's label cells, already rendered, in source order. */
  labels: ReactNode[]
  /** Contents of the prose cell, shown only while the row is open. */
  notes: ReactNode
}

/**
 * One row of a conformance table, with its paragraph folded away.
 *
 * A stated-width table gives its prose column whatever the label columns leave,
 * which on a seven-column table is under 200px — a measure of about 23
 * characters, and rows tall enough that the reader loses the row they are on
 * partway down it. Folding the paragraph under the row gives it the width of the
 * whole sheet when it is wanted and takes it out of the way when it is not, and
 * the labels above keep the geometry they already had.
 *
 * The row stays a real row of a real table: the paragraph is a second `tr`
 * spanning every column rather than a panel beside the table, so the columns go
 * on lining up and a screen reader still reads the thing as a table.
 */
export function FanfoldExpandableRow({ labels, notes }: ExpandableRowProps) {
  const [open, setOpen] = useState(false)
  const notesId = useId()
  const notesRow = useRef<HTMLTableRowElement>(null)

  // `hidden="until-found"` lets the browser open a folded row when the reader
  // searches the page for something inside it. It has to be set here rather than
  // in the markup below because React holds `hidden` as a boolean attribute and
  // writes any value of it out as a bare `hidden`, losing the keyword.
  //
  // Rewriting it after every render is safe: React only touches an attribute
  // when its prop changes, and `hidden={!open}` does not change while the row
  // stays shut, so nothing here is undone until the row opens.
  useEffect(() => {
    const row = notesRow.current
    if (!row || open) return
    row.setAttribute('hidden', 'until-found')
  }, [open])

  // The browser drops the attribute itself when a search matches inside the row,
  // so React has to be told, or its next render would hide the match again.
  useEffect(() => {
    const row = notesRow.current
    if (!row) return
    const reveal = () => setOpen(true)
    row.addEventListener('beforematch', reveal)
    return () => row.removeEventListener('beforematch', reveal)
  }, [])

  return (
    <>
      <tr data-fanfold-summary data-open={open || undefined}>
        {labels}
        <td data-fanfold-toggle>
          <button
            type='button'
            aria-expanded={open}
            aria-controls={notesId}
            onClick={() => setOpen(value => !value)}
          >
            <span data-fanfold-chevron aria-hidden='true'>
              &rsaquo;
            </span>
            <span>{open ? 'Hide' : 'Notes'}</span>
          </button>
        </td>
      </tr>
      <tr
        id={notesId}
        ref={notesRow}
        data-fanfold-notes
        hidden={!open}
      >
        {/* One more than the labels, for the column the toggle sits in. */}
        <td colSpan={labels.length + 1}>
          <div>{notes}</div>
        </td>
      </tr>
    </>
  )
}
