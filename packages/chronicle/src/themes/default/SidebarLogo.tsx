'use client';

import { BookOpenIcon } from '@/components/ui/icons';
import { useTheme } from '@raystack/apsara';
import type { ChronicleConfig } from '@/types';
import styles from './Layout.module.css';

interface SidebarLogoProps {
  config: ChronicleConfig;
}

export function SidebarLogo({ config }: SidebarLogoProps) {
  const { resolvedTheme } = useTheme();
  const logo = config.logo;

  if (logo) {
    const src = resolvedTheme === 'dark'
      ? logo.dark ?? logo.light
      : logo.light ?? logo.dark;
    if (src) {
      return <img src={src} alt={config.site.title} className={styles.sidebarLogo} />;
    }
  }

  return <BookOpenIcon width={28} height={28} />;
}
