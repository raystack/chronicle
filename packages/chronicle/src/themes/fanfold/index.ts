import type { Theme } from '@/types';
import { Landing } from './Landing';
import { Layout } from './Layout';
import { Page } from './Page';
import { PageSkeleton } from './Skeleton';

export const fanfoldTheme: Theme = {
  Layout,
  Page,
  Landing,
  Skeleton: PageSkeleton,
};
