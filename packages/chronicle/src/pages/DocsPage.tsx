import type { MDXContent } from 'mdx/types'
import { loadConfig } from '@/lib/config'
import { source, buildPageTree } from '@/lib/source'
import { getTheme } from '@/themes/registry'
import { mdxComponents } from '@/components/mdx'
import { Head } from '@/lib/head'

interface DocsPageProps {
  slug: string[]
}

interface PageData {
  title: string
  description?: string
  body: MDXContent
  toc: { title: string; url: string; depth: number }[]
}

export function DocsPage({ slug }: DocsPageProps) {
  const config = loadConfig()
  const page = source.getPage(slug)

  if (!page) return null

  const { Page } = getTheme(config.theme?.name)
  const data = page.data as PageData
  const MDXBody = data.body
  const tree = buildPageTree()
  const pageUrl = config.url ? `${config.url}/${slug.join('/')}` : undefined

  return (
    <>
      <Head
        title={data.title}
        description={data.description}
        config={config}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description,
          ...(pageUrl && { url: pageUrl }),
        }}
      />
      <Page
        page={{
          slug,
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
