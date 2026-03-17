import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Headline, Text } from '@raystack/apsara'
import { usePageContext } from '@/lib/page-context'
import { EndpointPage } from '@/components/api'
import { Head } from '@/lib/head'
import type { ApiSpec } from '@/lib/openapi'

interface ApiPageProps {
  slug: string[]
}

export function ApiPage({ slug }: ApiPageProps) {
  const { config } = usePageContext()

  // TODO: API specs need to be loaded server-side and passed via context
  return (
    <Head
      title="API Reference"
      description={`API documentation for ${config.title}`}
      config={config}
    />
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
