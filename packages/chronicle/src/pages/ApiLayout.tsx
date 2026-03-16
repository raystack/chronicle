import type { ReactNode } from 'react'
import { cx } from 'class-variance-authority'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiPageTree } from '@/lib/api-routes'
import { getTheme } from '@/themes/registry'
import { Search } from '@/components/ui/search'
import styles from '@/app/apis/[[...slug]]/layout.module.css'

interface ApiLayoutProps {
  children: ReactNode
}

export function ApiLayout({ children }: ApiLayoutProps) {
  const config = loadConfig()
  const { Layout, className } = getTheme(config.theme?.name)
  const specs = loadApiSpecs(config.api ?? [])
  const tree = buildApiPageTree(specs)

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
