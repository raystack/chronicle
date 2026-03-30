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

  if (isAnchor) {
    return (
      <ApsaraLink href={href} {...props}>
        {children}
      </ApsaraLink>
    );
  }

  if (isExternal) {
    return (
      <ApsaraLink
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        {...props}
      >
        {children}
      </ApsaraLink>
    );
  }

  return (
    <RouterLink to={href} className={props.className}>
      {children}
    </RouterLink>
  );
}
