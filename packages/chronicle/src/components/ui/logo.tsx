'use client';

import { useTheme } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { siteInitial } from '@/lib/site-initial';
import type { ChronicleConfig } from '@/types';
import styles from './logo.module.css';

interface SiteInitialProps {
  title: string;
  size?: number;
  className?: string;
  /** Omit to hide it from assistive technology. */
  label?: string;
}

/** A site's first letter in a tinted box. The mark for a site that sets none. */
export function SiteInitial({
  title,
  size = 28,
  className,
  label
}: SiteInitialProps) {
  return (
    <span
      className={cx(styles.initial, className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {siteInitial(title)}
    </span>
  );
}

interface LogoProps {
  config: ChronicleConfig;
  /** Box the logo is drawn in, in px. Square. */
  size?: number;
  className?: string;
  /**
   * Whether assistive technology should announce it. Pass `false` where the
   * site name is already rendered beside it, or it is read out twice.
   */
  labelled?: boolean;
}

/**
 * A site's logo: whichever of `logo.light` / `logo.dark` suits the active
 * theme, falling back to the site's initial when it sets neither.
 */
export function Logo({
  config,
  size = 28,
  className,
  labelled = true
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const logo = config.logo;

  const src =
    resolvedTheme === 'dark'
      ? (logo?.dark ?? logo?.light)
      : (logo?.light ?? logo?.dark);

  if (src) {
    return (
      <img
        src={src}
        alt={labelled ? config.site.title : ''}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  return (
    <SiteInitial
      title={config.site.title}
      size={size}
      className={className}
      label={labelled ? config.site.title : undefined}
    />
  );
}
