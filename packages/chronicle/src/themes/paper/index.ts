import type { Theme } from '@/types';
import { Layout } from './Layout';
import { Page } from './Page';
import { PageSkeleton } from './Skeleton';

export const paperTheme: Theme = {
  Layout,
  Page,
  Skeleton: PageSkeleton,
};
