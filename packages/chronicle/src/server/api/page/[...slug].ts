import { defineHandler, HTTPError } from 'nitro';
import { getPage } from '@/lib/source';

export default defineHandler(async event => {
  const slugParam = event.context.params?.slug ?? '';
  const slug = slugParam ? slugParam.split('/') : [];
  const page = await getPage(slug);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const data = page.data as Record<string, unknown>;
  const relativePath = (data._relativePath as string) ?? '';

  return {
    frontmatter: {
      title: (data.title as string) ?? slug[slug.length - 1] ?? 'Untitled',
      description: data.description as string | undefined,
      order: data.order as number | undefined,
      icon: data.icon as string | undefined,
      lastModified: data.lastModified as string | undefined,
    },
    relativePath,
  };
});
