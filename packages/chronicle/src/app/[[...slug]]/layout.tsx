import { loadConfig } from '@/lib/config'
import { buildPageTree } from '@/lib/source'
import { getTheme } from '@/themes/registry'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const config = loadConfig()
  const tree = buildPageTree()
  const { Layout, className } = getTheme(config.theme?.name)

  return (
    <Layout config={config} tree={tree} classNames={{ layout: className }}>
      {children}
    </Layout>
  )
}
