'use client';

import { useTheme } from '@raystack/apsara';
import type { ChronicleConfig } from '@/types';

/**
 * The Raystack mark, from `raystack/website` (`public/brand/logo.svg`).
 *
 * Drawn with `currentColor` rather than the brand navy so it reads on a dark
 * page as well as a light one, and so a theme can tint it by setting a text
 * colour on the element around it. The single path is the shape as the brand
 * file draws it, with its flat radial gradient replaced by that fill.
 */
export function RaystackMark({
  width = 28,
  height = 28,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 103.923048 116.287187'
      width={width}
      height={height}
      className={className}
      role='img'
      aria-label='Raystack'
      fill='currentColor'
    >
      <path d='M1.0995468,30.0536799 L101.718938,88.1466179 C100.73439,89.5383643 99.4491496,90.7266003 97.9230485,91.6076952 L57.9615242,114.679492 C54.2487113,116.823085 49.6743371,116.823085 45.9615242,114.679492 L6,91.6076952 C2.28718708,89.4641016 0,85.5025774 0,81.2153903 L0,35.0717968 C0,33.3095155 0.386462402,31.6022611 1.0995468,30.0536799 Z M18.757,17.313 L103.923,66.483 L103.923048,81.2153903 C103.923048,81.7371223 103.889176,82.2540313 103.822983,82.7634277 L4.70864397,25.540743 C5.11691976,25.2284994 5.54789032,24.9405176 6,24.6794919 L18.757,17.313 Z M35.253,7.789 L103.923,47.435 L103.923,59.885 L24.471,14.014 L35.253,7.789 Z M57.9615242,1.60769515 L97.9230485,24.6794919 C101.635861,26.8230855 103.923048,30.7846097 103.923048,35.0717968 L103.923,40.838 L40.967,4.49 L45.9615242,1.60769515 C49.6743371,-0.535898385 54.2487113,-0.535898385 57.9615242,1.60769515 Z' />
    </svg>
  );
}

interface LogoProps {
  config: ChronicleConfig;
  /** Box the logo is drawn in, in px. Square. */
  size?: number;
  className?: string;
}

/**
 * A site's logo: whichever of `logo.light` / `logo.dark` suits the active
 * theme, falling back to the Raystack mark when a site declares neither.
 *
 * Shared by every theme so the fallback is the same picture everywhere, and so
 * a site that sets one logo gets it in all three.
 */
export function Logo({ config, size = 28, className }: LogoProps) {
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
        alt={config.site.title}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  return <RaystackMark width={size} height={size} className={className} />;
}
