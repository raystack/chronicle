import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) return {}
  const data = page.data as PageData
  const ogParams = new URLSearchParams({ title: data.title })
  if (data.description) ogParams.set('description', data.description)

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: [{ url: `/og?${ogParams.toString()}`, width: 1200, height: 630 }],
    },
  }
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

  return (
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
  )
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: page.slugs,
  }))
}
