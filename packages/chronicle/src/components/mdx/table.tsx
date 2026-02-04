'use client'

import { Table } from '@raystack/apsara'
import type { ComponentProps, ReactNode } from 'react'

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
