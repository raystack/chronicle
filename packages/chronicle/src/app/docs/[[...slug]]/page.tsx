import { notFound } from 'next/navigation'
import { loadConfig } from '../../../lib/config'
import { createSource, buildPageTree } from '../../../lib/source'
import { defaultTheme } from '../../../themes/default'

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params
  const config = loadConfig()
  const source = createSource({ contentDir: config.contentDir })
  const tree = buildPageTree(source)

  const pagePath = slug?.join('/') ?? ''
  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const { Layout, Page } = defaultTheme

  const MDXContent = page.data.body

  return (
    <Layout config={config} tree={tree}>
      <Page
        page={{
          slug: slug ?? [],
          frontmatter: {
            title: page.data.title,
            description: page.data.description,
          },
          content: <MDXContent />,
          toc: page.data.toc,
        }}
        config={config}
      />
    </Layout>
  )
}

export async function generateStaticParams() {
  const config = loadConfig()
  const source = createSource({ contentDir: config.contentDir })
  const pages = source.getPages()

  return pages.map((page) => ({
    slug: page.slugs,
  }))
}
