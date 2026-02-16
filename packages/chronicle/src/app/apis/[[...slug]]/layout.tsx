import { loadConfig } from '../../../lib/config'
import { loadApiSpecs } from '../../../lib/openapi'
import { buildApiPageTree } from '../../../lib/api-routes'
import { Layout } from '../../../themes/default'

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  const config = loadConfig()
  const specs = loadApiSpecs(config.api ?? [])
  const tree = buildApiPageTree(specs)

  return (
    <Layout config={config} tree={tree}>
      {children}
    </Layout>
  )
}
