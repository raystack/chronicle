'use client'

import { Avatar, getAvatarColor } from '@raystack/apsara'
import { authorInitials, parseAuthors } from '@/lib/authors'
import styles from './author-byline.module.css'

interface AuthorBylineProps {
  /** Raw `authors` frontmatter entries — `Name <email>` or a bare name. */
  authors?: string[]
  className?: string
}

/** Avatar-and-name byline for the authors declared in a page's frontmatter. */
export function AuthorByline({ authors, className }: AuthorBylineProps) {
  const parsed = parseAuthors(authors)
  if (parsed.length === 0) return null

  return (
    <div className={className ? `${styles.byline} ${className}` : styles.byline}>
      {parsed.map((author, index) => (
        <span className={styles.author} key={`${author.name}-${index}`}>
          <Avatar
            size={2}
            fallback={authorInitials(author.name)}
            color={getAvatarColor(author.name)}
            aria-hidden='true'
          />
          {author.email ? (
            <a className={styles.name} href={`mailto:${author.email}`}>
              {author.name}
            </a>
          ) : (
            <span className={styles.name}>{author.name}</span>
          )}
        </span>
      ))}
    </div>
  )
}
