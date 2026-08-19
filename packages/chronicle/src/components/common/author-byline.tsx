'use client'

import { Avatar, getAvatarColor } from '@raystack/apsara'
import type { Author } from '@/types'
import { authorInitials, resolveAuthors } from '@/lib/authors'
import { usePageContext } from '@/lib/page-context'
import styles from './author-byline.module.css'

/** Beyond this, the remainder is collapsed into a `+N` counter. */
const MAX_VISIBLE = 2

interface AuthorBylineProps {
  /** Raw `authors` frontmatter entries — `Name <email>` or a bare name. */
  authors?: string[]
  /**
   * `block` stands on its own under a page title; `inline` sits in a meta line
   * beside other text and inherits its typography.
   */
  variant?: 'block' | 'inline'
  className?: string
}

/** The name, linked to a profile url or email when the author has one. */
function AuthorName({ author }: { author: Author }) {
  if (author.url) {
    return (
      <a className={styles.name} href={author.url} rel='noreferrer' target='_blank'>
        {author.name}
      </a>
    )
  }
  if (author.email) {
    return (
      <a className={styles.name} href={`mailto:${author.email}`}>
        {author.name}
      </a>
    )
  }
  return <span className={styles.name}>{author.name}</span>
}

/** Byline for the authors declared in a page's frontmatter. */
export function AuthorByline({ authors, variant = 'block', className }: AuthorBylineProps) {
  const { config } = usePageContext()
  const parsed = resolveAuthors(authors, config)
  if (parsed.length === 0) return null

  const wrapper = variant === 'inline' ? styles.inlineByline : styles.byline
  const shown = parsed.slice(0, MAX_VISIBLE)
  const hidden = parsed.slice(MAX_VISIBLE)

  return (
    <span className={className ? `${wrapper} ${className}` : wrapper}>
      {shown.map((author, index) => (
        <span className={styles.author} key={`${author.slug}-${index}`}>
          <Avatar
            size={2}
            radius='full'
            src={author.avatar}
            alt={author.avatar ? author.name : undefined}
            fallback={authorInitials(author.name)}
            color={getAvatarColor(author.name)}
            aria-hidden={author.avatar ? undefined : 'true'}
          />
          <AuthorName author={author} />
        </span>
      ))}
      {hidden.length > 0 && (
        <span className={styles.more} title={hidden.map(author => author.name).join(', ')}>
          {`+${hidden.length}`}
        </span>
      )}
    </span>
  )
}
