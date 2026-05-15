import { Link as ApsaraLink } from '@raystack/apsara';
import type { ComponentProps } from 'react';
import { Link as RouterLink } from 'react-router';

type LinkProps = ComponentProps<'a'>;

export function Link({ href, children, ...props }: LinkProps) {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const isAnchor = href.startsWith('#');

  if (isExternal) {
    return (
      <ApsaraLink href={href} external {...props}>
        {children}
      </ApsaraLink>
    );
  }

  if (isAnchor) {
    return (
      <ApsaraLink href={href} {...props}>
        {children}
      </ApsaraLink>
    );
  }

  return (
    <ApsaraLink render={<RouterLink to={href} />} {...props}>
      {children}
    </ApsaraLink>
  );
}
