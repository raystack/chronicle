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

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params
  const config = loadConfig()

  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const { Layout, Page } = getTheme(config.theme?.name)

  const data = page.data as PageData
  const MDXBody = data.body

  const tree = buildPageTree()

  return (
    <Layout config={config} tree={tree}>
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
    </Layout>
  )
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: page.slugs,
  }))
}
