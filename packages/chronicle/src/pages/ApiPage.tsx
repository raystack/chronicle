import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Headline, Text } from '@raystack/apsara'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { findApiOperation } from '@/lib/api-routes'
import { EndpointPage } from '@/components/api'
import { Head } from '@/lib/head'
import type { ApiSpec } from '@/lib/openapi'

interface ApiPageProps {
  slug: string[]
}

export function ApiPage({ slug }: ApiPageProps) {
  const config = loadConfig()
  const specs = loadApiSpecs(config.api ?? [])

  if (slug.length === 0) {
    return (
      <>
        <Head
          title="API Reference"
          description={`API documentation for ${config.title}`}
          config={config}
        />
        <ApiLanding specs={specs} />
      </>
    )
  }

  const match = findApiOperation(specs, slug)
  if (!match) return null

  const operation = match.operation as OpenAPIV3.OperationObject
  const title = operation.summary ?? `${match.method.toUpperCase()} ${match.path}`

  return (
    <>
      <Head
        title={title}
        description={operation.description}
        config={config}
      />
      <EndpointPage
        method={match.method}
        path={match.path}
        operation={match.operation}
        serverUrl={match.spec.server.url}
        specName={match.spec.name}
        auth={match.spec.auth}
      />
    </>
  )
}

function ApiLanding({ specs }: { specs: ApiSpec[] }) {
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
