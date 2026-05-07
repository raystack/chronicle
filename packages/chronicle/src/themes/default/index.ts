import type { Theme } from '@/types';
import { Layout } from './Layout';
import { Page } from './Page';
import { PageSkeleton } from './Skeleton';
import { Toc } from './Toc';

export const defaultTheme: Theme = {
  Layout,
  Page,
  Skeleton: PageSkeleton,
};

export { Layout, Page, PageSkeleton, Toc };
