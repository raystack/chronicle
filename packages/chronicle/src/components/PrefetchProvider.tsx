import { useEffect } from 'react';
import { prefetchPageData } from '@/lib/preload';

function resolvePathname(href: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]');
      if (!anchor) return;
      const pathname = resolvePathname(anchor.getAttribute('href'));
      if (pathname) prefetchPageData(pathname);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]');
      if (!anchor) return;
      const pathname = resolvePathname(anchor.getAttribute('href'));
      if (pathname) prefetchPageData(pathname);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('focusin', handleFocusIn);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pathname = resolvePathname((entry.target as HTMLAnchorElement).getAttribute('href'));
            if (pathname) prefetchPageData(pathname);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '200px' },
    );

    const observeLinks = () => {
      document.querySelectorAll('a[href]:not([data-prefetch-observed])').forEach((link) => {
        const pathname = resolvePathname(link.getAttribute('href'));
        if (pathname) {
          link.setAttribute('data-prefetch-observed', '');
          observer.observe(link);
        }
      });
    };

    const mutationObserver = new MutationObserver(observeLinks);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    observeLinks();

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('focusin', handleFocusIn);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return children;
}
