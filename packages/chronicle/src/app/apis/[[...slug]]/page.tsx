import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Headline, Text } from '@raystack/apsara'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiRoutes, findApiOperation } from '@/lib/api-routes'
import { EndpointPage } from '@/components/api'

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const config = loadConfig()
  const specs = loadApiSpecs(config.api ?? [])
  const parentMetadata = await parent

  if (!slug || slug.length === 0) {
    const apiDescription = `API documentation for ${config.title}`
    const metadata: Metadata = {
      title: 'API Reference',
      description: apiDescription,
    }
    if (config.url) {
      metadata.openGraph = {
        ...parentMetadata.openGraph,
        title: 'API Reference',
        description: apiDescription,
        images: [{ url: `/og?title=${encodeURIComponent('API Reference')}&description=${encodeURIComponent(apiDescription)}`, width: 1200, height: 630 }],
      }
      metadata.twitter = {
        ...parentMetadata.twitter,
        title: 'API Reference',
        description: apiDescription,
      }
    }
    return metadata
  }

  const match = findApiOperation(specs, slug)
  if (!match) return {}

  const operation = match.operation as OpenAPIV3.OperationObject
  const title = operation.summary ?? `${match.method.toUpperCase()} ${match.path}`
  const description = operation.description

  const metadata: Metadata = { title, description }

  if (config.url) {
    const ogParams = new URLSearchParams({ title })
    if (description) ogParams.set('description', description)
    metadata.openGraph = {
      ...parentMetadata.openGraph,
      title,
      description,
      images: [{ url: `/og?${ogParams.toString()}`, width: 1200, height: 630 }],
    }
    metadata.twitter = {
      ...parentMetadata.twitter,
      title,
      description,
    }
  }

  return metadata
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
      serverUrl={match.spec.server.url}
      specName={match.spec.name}
      auth={match.spec.auth}
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
