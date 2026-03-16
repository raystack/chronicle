import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import type { MDXContent } from 'mdx/types'
import { loadConfig } from '@/lib/config'
import { source, buildPageTree } from '@/lib/source'
import { getTheme } from '@/themes/registry'
import { mdxComponents } from '@/components/mdx'

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

interface PageData {
  title: string
  description?: string
  body: MDXContent
  toc: { title: string; url: string; depth: number }[]
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) return {}
  const config = loadConfig()
  const data = page.data as PageData
  const parentMetadata = await parent

  const metadata: Metadata = {
    title: data.title,
    description: data.description,
  }

  if (config.url) {
    const ogParams = new URLSearchParams({ title: data.title })
    if (data.description) ogParams.set('description', data.description)
    metadata.openGraph = {
      ...parentMetadata.openGraph,
      title: data.title,
      description: data.description,
      images: [{ url: `/og?${ogParams.toString()}`, width: 1200, height: 630 }],
    }
    metadata.twitter = {
      ...parentMetadata.twitter,
      title: data.title,
      description: data.description,
    }
  }

  return metadata
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params
  const config = loadConfig()

  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const { Page } = getTheme(config.theme?.name)

  const data = page.data as PageData
  const MDXBody = data.body

  const tree = buildPageTree()

  const pageUrl = config.url ? `${config.url}/${(slug ?? []).join('/')}` : undefined

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description,
          ...(pageUrl && { url: pageUrl }),
        }, null, 2)}
      </script>
      <Page
        page={{
          slug: slug ?? [],
          frontmatter: {
            title: data.title,
            description: data.description,
          },
          content: <MDXBody components={mdxComponents} />,
          toc: data.toc ?? [],
        }}
        config={config}
        tree={tree}
      />
    </>
  )
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: page.slugs,
  }))
}
