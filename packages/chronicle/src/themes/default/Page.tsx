import { Flex, Box, Headline, Text, Link } from '@raystack/apsara'
import type { ThemePageProps } from '../../types'
import styles from './Page.module.css'

export function Page({ page, config }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <Headline as="h1" size="large">
            {page.frontmatter.title}
          </Headline>
          {page.frontmatter.description && (
            <Text size={4} className={styles.description}>
              {page.frontmatter.description}
            </Text>
          )}
        </header>
        <Box className={styles.content}>
          {page.content}
        </Box>
      </article>
      {page.toc.length > 0 && (
        <Box as="aside" className={styles.toc}>
          <Text size={2} weight="medium" className={styles.tocTitle}>
            On this page
          </Text>
          <ul className={styles.tocList}>
            {page.toc.map((item) => (
              <li
                key={item.url}
                style={{ paddingLeft: `var(--rs-space-${(item.depth - 2) * 2 + 2})` }}
              >
                <Link href={item.url}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Flex>
  )
}
