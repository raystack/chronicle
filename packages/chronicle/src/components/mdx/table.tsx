'use client'

import { Table } from '@raystack/apsara'
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { usePageContext } from '@/lib/page-context'
import { FanfoldExpandableRow } from '@/themes/fanfold/ExpandableRow'

/** A cell as `rehype-table-columns` leaves it: a size class, or none if prose. */
type CellElement = ReactElement<{ 'data-col'?: string; children?: ReactNode }>

/**
 * Separates a row's label cells from its one prose cell, or returns null when
 * the row is not one `rehype-table-columns` marked up — every label cell carries
 * a size class and the prose cell carries none, so the row can tell on its own
 * without being told which table it belongs to.
 */
function splitRow(children: ReactNode) {
  const cells = Children.toArray(children).filter(isValidElement) as CellElement[]
  const labels = cells.filter(cell => cell.props['data-col'] != null)
  const prose = cells.filter(cell => cell.props['data-col'] == null)
  if (labels.length < 2 || prose.length !== 1) return null
  return { cells, labels, prose: prose[0] }
}

type TableProps = ComponentProps<'table'>

export function MdxTable({ children, ...props }: TableProps) {
  return <Table {...props}>{children}</Table>
}

type TheadProps = ComponentProps<'thead'>

export function MdxThead({ children, ...props }: TheadProps) {
  return <Table.Header {...props}>{children}</Table.Header>
}

type TbodyProps = ComponentProps<'tbody'>

export function MdxTbody({ children, ...props }: TbodyProps) {
  return <Table.Body {...props}>{children}</Table.Body>
}

type TrProps = ComponentProps<'tr'>

export function MdxTr({ children, ...props }: TrProps) {
  const { config } = usePageContext()

  // Only fanfold folds the paragraph away. The other themes give a table the
  // full width of the page, so their prose column has room to stay in the row.
  if (config.theme?.name === 'fanfold') {
    const split = splitRow(children)

    if (split?.cells.every(cell => cell.type === MdxTh)) {
      // The prose column's heading moves over the toggle, so the reader can see
      // what is folded away rather than a bare chevron.
      return (
        <Table.Row {...props}>
          {split.labels}
          <th data-fanfold-toggle>{split.prose.props.children}</th>
        </Table.Row>
      )
    }

    if (split?.cells.every(cell => cell.type === MdxTd)) {
      return <FanfoldExpandableRow labels={split.labels} notes={split.prose.props.children} />
    }
  }

  return <Table.Row {...props}>{children}</Table.Row>
}

type ThProps = ComponentProps<'th'>

export function MdxTh({ children, ...props }: ThProps) {
  return <Table.Head {...props}>{children}</Table.Head>
}

type TdProps = ComponentProps<'td'>

export function MdxTd({ children, ...props }: TdProps) {
  return <Table.Cell {...props}>{children}</Table.Cell>
}
