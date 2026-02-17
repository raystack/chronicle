import { notFound } from 'next/navigation'
import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Headline, Text } from '@raystack/apsara'
import { loadConfig } from '../../../lib/config'
import { loadApiSpecs } from '../../../lib/openapi'
import { buildApiRoutes, findApiOperation } from '../../../lib/api-routes'
import { EndpointPage } from '../../../components/api'

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export default async function ApiPage({ params }: PageProps) {
  const { slug } = await params
  const config = loadConfig()
  const specs = loadApiSpecs(config.api ?? [])

  if (!slug || slug.length === 0) {
    return <ApiLanding specs={specs} />
  }

  const match = findApiOperation(specs, slug)
  if (!match) notFound()

  return (
    <EndpointPage
      method={match.method}
      path={match.path}
      operation={match.operation}
    />
  )
}

function ApiLanding({ specs }: { specs: { name: string; document: OpenAPIV3.Document }[] }) {
  return (
    <Flex direction="column" gap="large" style={{ padding: 'var(--rs-space-7)' }}>
      <Headline size="medium" as="h1">API Reference</Headline>
      {specs.map((spec) => (
        <Flex key={spec.name} direction="column" gap="small">
          <Headline size="small" as="h2">{spec.name}</Headline>
          {spec.document.info.description && (
            <Text size={3}>{spec.document.info.description}</Text>
          )}
        </Flex>
      ))}
    </Flex>
  )
}

export function generateStaticParams() {
  const config = loadConfig()
  const specs = loadApiSpecs(config.api ?? [])
  return [{ slug: [] }, ...buildApiRoutes(specs)]
}
