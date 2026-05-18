import { useEffect } from 'react';
import { prefetchPageData } from '@/lib/preload';

function isInternalLink(href: string | null): href is string {
  return !!href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:');
}

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (isInternalLink(href)) prefetchPageData(href);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (isInternalLink(href)) prefetchPageData(href);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('focusin', handleFocusIn);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const href = (entry.target as HTMLAnchorElement).getAttribute('href');
            if (isInternalLink(href)) prefetchPageData(href);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '200px' },
    );

    const observeLinks = () => {
      document.querySelectorAll('a[href]:not([data-prefetch-observed])').forEach((link) => {
        const href = link.getAttribute('href');
        if (isInternalLink(href)) {
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
