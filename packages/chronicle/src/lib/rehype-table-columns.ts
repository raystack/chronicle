import type { Element, ElementContent, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

/**
 * How long a single cell has to be before its column counts as able to hold
 * prose. Measured against the corpus this was built for: across 482 tables the
 * columns holding sentences top out well past this, while the ones holding
 * names, clause references and flags sit under 100 characters. Anything below
 * the line is a column of labels, however wide the widest label happens to be.
 */
const PROSE_MIN_CHARS = 120

/**
 * Size classes for the columns that are not the prose column, by the longest run
 * of text in the column that cannot be broken. The theme turns these into
 * widths; the classes exist so that the decision about how much room a column of
 * clause references deserves lives in the theme, next to the type it is sizing,
 * rather than here.
 *
 * The run is what matters rather than the longest cell, because a stated width
 * is narrower than the longest cell by design — the cell is expected to wrap. It
 * is only the unbreakable run that has to fit on one line, and a class narrower
 * than its own run is what produced `Unsupporte` above a stray `d`. So each
 * class here is a promise the theme keeps: a column of this class fits this many
 * characters without breaking a word.
 *
 * The last class is a catch-all. A run too long even for that is set narrow and
 * breaks, which is the lesser fault: the alternative is handing the table back
 * to automatic layout, and that hides the end of every line off the sheet.
 */
const SIZE_CLASSES = [
  { name: 'xs', maxRun: 6 },
  { name: 's', maxRun: 10 },
  { name: 'm', maxRun: 13 },
  { name: 'l', maxRun: 17 },
] as const

const WIDEST_CLASS = 'xl'

function sizeClass(run: number): string {
  for (const size of SIZE_CLASSES) {
    if (run <= size.maxRun) return size.name
  }
  return WIDEST_CLASS
}

/**
 * Header text is set smaller than the cells below it, so a heading of a given
 * length needs less room than the same length of body copy. Without this a
 * column of one-character flags would be sized for the whole of "SUPPORT" as
 * though it were body text, and four such columns would take 176px from the one
 * column holding paragraphs.
 */
const HEADER_CHAR_RATIO = 0.85

/**
 * How many columns of labels a table needs before stating their widths is worth
 * it. One label beside a paragraph is a field-and-value pair: automatic layout
 * already fits it, and stating a width there would only make one table look
 * different from the untagged ones beside it.
 */
const MIN_LABEL_COLUMNS = 2

/**
 * Punctuation a long label may break after. These are the seams of an
 * identifier — `Octet_String.indication` reads as three parts, and breaking it
 * at one of them is the difference between a wrapped name and a typo.
 *
 * A hyphen is absent because CSS already offers a break after one, so an item
 * code like "SPP-14" can break there without any help; that is what the 8ch
 * floor further up is for.
 */
const BREAK_AFTER = new Set(['.', '_', '/', ':'])

/**
 * Words at or below this length are left alone. The narrowest label column
 * holds about eleven characters, so anything shorter than this cannot be forced
 * to break and gains nothing from the extra markup — a clause reference like
 * "4.1.3.3.3.4" keeps every dot unbroken.
 */
const MIN_BREAKABLE_WORD = 12

/**
 * Splits a string where a long word could sensibly break, returning the parts
 * that a break opportunity should sit between.
 *
 * Two kinds of seam. After the punctuation of an identifier, and before a
 * capital that starts a new word inside one — `TransmissionConstraintList` has
 * no punctuation at all, and the humps are the only thing it can be broken at
 * without cutting a word in half.
 *
 * Neither is taken within two characters of either end of the word, where a
 * break would stand one or two letters on a line by themselves.
 */
function breakParts(value: string): string[] {
  const parts: string[] = []
  let start = 0

  for (const match of value.matchAll(/\S+/g)) {
    const word = match[0]
    if (word.length <= MIN_BREAKABLE_WORD || match.index === undefined) continue

    for (let index = 2; index <= word.length - 2; index++) {
      const afterPunctuation = BREAK_AFTER.has(word[index - 1])
      const camelHump = /[A-Z]/.test(word[index]) && /[a-z0-9]/.test(word[index - 1])
      if (!afterPunctuation && !camelHump) continue

      const cut = match.index + index
      parts.push(value.slice(start, cut))
      start = cut
    }
  }

  parts.push(value.slice(start))
  return parts
}

/**
 * The longest run of characters in a string with no way to break inside it —
 * what the column has to fit on one line. Whitespace, the seams that
 * `breakParts` finds, and hyphens all end a run, the last because CSS already
 * offers a break after one.
 */
function longestRun(value: string): number {
  let longest = 0

  for (const part of breakParts(value)) {
    for (const word of part.split(/\s+/)) {
      for (const run of word.split(/(?<=-)/)) {
        longest = Math.max(longest, run.length)
      }
    }
  }

  return longest
}

/**
 * Offers the line breaker somewhere sensible to break the long labels in a cell.
 *
 * A stated width is narrower than the longest label it has to hold, so those
 * labels wrap — and `overflow-wrap: break-word` wraps a word with no break
 * opportunity in it by cutting anywhere, which turned `Packet.request` into
 * `Packet.requ` and a stray `est`. Widening the column instead would work, but
 * a 23-character identifier needs 209px of it, taken from the one column that
 * is holding paragraphs.
 *
 * `<wbr>` costs nothing and reads as nothing: it is a break opportunity rather
 * than a character, so it leaves the text it sits in untouched when copied.
 * `break-word` stays on underneath as the fallback for a word with no seam in
 * it at all, so that nothing can ever grow past its cell — the cells here are
 * `overflow: hidden` with an ellipsis, and a word that refuses to break is a
 * word whose end is quietly cut off.
 */
function addBreakOpportunities(parent: Element): void {
  const children: ElementContent[] = []
  let inserted = false

  for (const child of parent.children) {
    if (child.type === 'element') {
      addBreakOpportunities(child)
      children.push(child)
      continue
    }

    if (child.type !== 'text') {
      children.push(child)
      continue
    }

    const parts = breakParts(child.value)
    if (parts.length === 1) {
      children.push(child)
      continue
    }

    inserted = true
    parts.forEach((part, index) => {
      if (index > 0) {
        children.push({ type: 'element', tagName: 'wbr', properties: {}, children: [] })
      }
      children.push({ type: 'text', value: part })
    })
  }

  if (inserted) parent.children = children
}

/** Concatenates every text descendant, so a cell's markup does not hide its length. */
function toText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { children?: unknown[]; value?: unknown }
  if (Array.isArray(n.children)) return n.children.map(toText).join('')
  return typeof n.value === 'string' ? n.value : ''
}

function isCell(node: Element): boolean {
  return node.tagName === 'th' || node.tagName === 'td'
}

/** The cells of one row, or null if any of them spans more than one column. */
function cellsOf(row: Element): Element[] | null {
  const cells = row.children.filter(
    (child): child is Element => child.type === 'element' && isCell(child)
  )
  for (const cell of cells) {
    if (cell.properties.colSpan != null || cell.properties.rowSpan != null) return null
  }
  return cells
}

interface ColumnStats {
  /** Longest cell in the column, header included — what makes a column prose. */
  longest: number
  /** Longest unbreakable run, in body characters — what the column must fit. */
  run: number
}

/**
 * Marks up what each column of a table holds, so a theme can lay one out
 * without guessing from the column count.
 *
 * The problem it solves: a conformance table puts an item code, a name, a clause
 * reference and two flags beside a column of full paragraphs. Automatic table
 * layout gives the paragraph column whatever it asks for, which runs the table
 * past its container and hides the end of every line, and it sizes each table
 * from that table's own content, so no two on a page line up. Stating the widths
 * fixes both, but only a theme that knows which column is which can state them,
 * and CSS cannot ask how much text is in a column.
 *
 * So a table whose shape a theme can state widths for is given `data-fit`, and
 * each of its label cells a `data-col` size class sized to the longest run of
 * text in that column that cannot be broken. The label column holding the most
 * text also gets `data-grow`, marking it as the one to give any spare width to. The prose column is left
 * without one: in a fixed layout it takes whatever the stated columns do not,
 * which is exactly what it should have. Absence of a class is what identifies
 * it, so no second attribute has to agree with the first.
 *
 * A table that is any other shape gets no attributes at all. Marking one up and
 * leaving the theme to opt out in CSS was worse: a width meant for a stated
 * layout leaks into automatic layout as a preference, and a field-and-value pair
 * came out with a narrower label column than the untagged tables beside it.
 *
 * One threshold does all the deciding. A column with a cell of at least
 * PROSE_MIN_CHARS can hold prose; every other column is a column of labels,
 * whatever the length of its longest label. A table qualifies when exactly one
 * of its columns clears that line and at least two do not.
 */
const rehypeTableColumns: Plugin<[], Root> = () => {
  return tree => {
    visit(tree, 'element', (table: Element) => {
      if (table.tagName !== 'table') return

      const rows: Element[] = []
      visit(table, 'element', (node: Element) => {
        if (node.tagName === 'tr') rows.push(node)
      })
      if (rows.length < 2) return

      const grid: Element[][] = []
      for (const row of rows) {
        const cells = cellsOf(row)
        // A spanning cell means the columns below it are not a straight grid,
        // and every measurement here assumes one cell per column per row.
        if (!cells) return
        grid.push(cells)
      }

      const columns = grid[0].length
      if (columns < 2) return
      if (grid.some(row => row.length !== columns)) return

      // The first row is the header — its text counts towards what a column has
      // to fit, because a one-word heading over a column of flags is usually the
      // widest thing in it, but not towards how much the column carries.
      const [header, ...body] = grid
      if (body.length === 0) return

      const stats: ColumnStats[] = []
      for (let column = 0; column < columns; column++) {
        const texts = body.map(row => toText(row[column]).trim())
        const headerText = toText(header[column]).trim()
        stats.push({
          longest: Math.max(headerText.length, ...texts.map(text => text.length)),
          run: Math.max(
            Math.ceil(longestRun(headerText) * HEADER_CHAR_RATIO),
            ...texts.map(longestRun)
          ),
        })
      }

      // Exactly one column may hold prose. Two would each need a paragraph's room
      // and there is only one remainder to give away, so such a table is left to
      // size itself and scroll — as is one with no prose column at all, which
      // automatic layout already serves.
      const proseColumns = stats.filter(column => column.longest >= PROSE_MIN_CHARS)
      if (proseColumns.length !== 1) return
      const proseColumn = stats.indexOf(proseColumns[0])

      // Every other column is a column of labels, and its class is the width its
      // longest line needs. Nothing is marked up unless the whole table is a
      // shape a theme can state widths for, so automatic layout is left
      // completely alone everywhere else.
      if (columns - 1 < MIN_LABEL_COLUMNS) return
      const classes = stats.map((column, index) =>
        index === proseColumn ? null : sizeClass(column.run)
      )

      // One label column is marked to take whatever the others leave. A theme
      // that folds the prose column away frees most of the table's width, and
      // without somewhere to send it that room pools in whichever column the
      // theme left unsized — on a three-column table that was 77% of the sheet
      // standing empty beside a name wrapped over five lines. The column
      // carrying the most text is the one that can use it.
      let growColumn = -1
      for (let column = 0; column < columns; column++) {
        if (classes[column] === null) continue
        // `>=` so that a later column wins a tie, where the labels tend to run
        // from short codes towards longer names.
        if (growColumn === -1 || stats[column].longest >= stats[growColumn].longest) {
          growColumn = column
        }
      }

      table.properties['data-fit'] = 'stated'
      for (const row of grid) {
        for (let column = 0; column < columns; column++) {
          const name = classes[column]
          if (name) row[column].properties['data-col'] = name
          if (name && column === growColumn) row[column].properties['data-grow'] = 'true'
          // The prose column gets seams too: its width is the remainder, which
          // on a crowded table is narrow enough to break an identifier.
          addBreakOpportunities(row[column])
        }
      }
    })
  }
}

export default rehypeTableColumns
