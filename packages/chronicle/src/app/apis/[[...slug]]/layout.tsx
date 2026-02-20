import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiPageTree } from '@/lib/api-routes'
import { getTheme } from '@/themes/registry'
import { Search } from '@/components/ui/search'
import styles from './layout.module.css'

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  const config = loadConfig()
  const { Layout } = getTheme(config.theme?.name)
  const specs = loadApiSpecs(config.api ?? [])
  const tree = buildApiPageTree(specs)

  return (
    <Layout config={config} tree={tree} classNames={{
      layout: styles.layout,
      body: styles.body,
      sidebar: styles.sidebar,
      content: styles.content,
    }}>
      <Search className={styles.hiddenSearch} />
      {children}
    </Layout>
  )
}
