import { source } from '../../../lib/source'
import { createSearchAPI, type AdvancedIndex } from 'fumadocs-core/search/server'
import type { StructuredData } from 'fumadocs-core/mdx-plugins'

interface PageData {
  title?: string
  description?: string
  structuredData?: StructuredData
  load?: () => Promise<{ structuredData?: StructuredData }>
}

export const { GET } = createSearchAPI('advanced', {
  indexes: async (): Promise<AdvancedIndex[]> => {
    const pages = source.getPages()
    const indexes = await Promise.all(
      pages.map(async (page): Promise<AdvancedIndex> => {
        const data = page.data as PageData
        let structuredData: StructuredData | undefined = data.structuredData

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
