import { source } from '../../../lib/source'
import { createSearchAPI } from 'fumadocs-core/search/server'

interface StructuredDataHeading {
  id: string
  content: string
}

interface StructuredDataContent {
  heading?: string
  content: string
}

interface StructuredData {
  headings?: StructuredDataHeading[]
  contents?: StructuredDataContent[]
}

interface PageData {
  title?: string
  description?: string
  structuredData?: StructuredData
  load?: () => Promise<{ structuredData?: StructuredData }>
}

export const { GET } = createSearchAPI('advanced', {
  indexes: async () => {
    const pages = source.getPages()
    const indexes = await Promise.all(
      pages.map(async (page) => {
        const data = page.data as PageData
        let structuredData = data.structuredData

        if (!structuredData && data.load) {
          try {
            const loaded = await data.load()
            structuredData = loaded.structuredData
          } catch (error) {
            console.error(`Failed to load structured data for ${page.url}:`, error)
          }
        }

        return {
          id: page.url,
          url: page.url,
          title: data.title ?? '',
          description: data.description ?? '',
          structuredData: structuredData ?? { headings: [], contents: [] },
        }
      })
    )
    return indexes
  },
})
