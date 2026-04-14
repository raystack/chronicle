import { Link as ApsaraLink } from '@raystack/apsara';
import type { ComponentProps, MouseEvent } from 'react';
import { useNavigate } from 'react-router';

type LinkProps = ComponentProps<'a'>;

export function Link({ href, children, ...props }: LinkProps) {
  const navigate = useNavigate();

  if (!href) {
    return <span {...props}>{children}</span>;
  }

  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const isAnchor = href.startsWith('#');

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

  if (isAnchor) {
    return (
      <ApsaraLink href={href} {...props}>
        {children}
      </ApsaraLink>
    );
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <ApsaraLink href={href} onClick={onClick} {...props}>
      {children}
    </ApsaraLink>
  );
}
