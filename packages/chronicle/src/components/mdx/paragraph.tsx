import { Children, isValidElement, type ComponentProps } from 'react'
import styles from './paragraph.module.css'

const BLOCK_ELEMENTS = new Set(['summary', 'details', 'div', 'table', 'ul', 'ol', 'p'])

function hasBlockChild(children: React.ReactNode): boolean {
  return Children.toArray(children).some(
    (child) => isValidElement(child) && typeof child.type === 'string' && BLOCK_ELEMENTS.has(child.type)
  )
}

export function MdxParagraph({ children, className, ...props }: ComponentProps<'p'>) {
  const Tag = hasBlockChild(children) ? 'div' : 'p'
  return (
    <Tag className={`${styles.paragraph} ${className ?? ''}`} {...props}>
      {children}
    </Tag>
  )
}
