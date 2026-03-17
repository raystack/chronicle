import type { ReactNode } from 'react'
import { cx } from 'class-variance-authority'
import { usePageContext } from '@/lib/page-context'
import { getTheme } from '@/themes/registry'
import { Search } from '@/components/ui/search'
import styles from './ApiLayout.module.css'

interface ApiLayoutProps {
  children: ReactNode
}

export function ApiLayout({ children }: ApiLayoutProps) {
  const { config } = usePageContext()
  const { Layout, className } = getTheme(config.theme?.name)
  // TODO: API specs need to be loaded server-side and passed via context
  const tree = { name: 'root', children: [] }

  return (
    <Layout config={config} tree={tree} classNames={{
      layout: cx(styles.layout, className),
      body: styles.body,
      sidebar: styles.sidebar,
      content: styles.content,
    }}>
      <Search className={styles.hiddenSearch} />
      {children}
    </Layout>
  )
}
