import { Link as RouterLink, useLocation } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import type { Root, Node } from 'fumadocs-core/page-tree';
import styles from './ChapterNav.module.css';

const iconMap: Record<string, React.ReactNode> = {
  'method-get': <MethodBadge method='GET' size='micro' />,
  'method-post': <MethodBadge method='POST' size='micro' />,
  'method-put': <MethodBadge method='PUT' size='micro' />,
  'method-delete': <MethodBadge method='DELETE' size='micro' />,
  'method-patch': <MethodBadge method='PATCH' size='micro' />
};

interface ChapterNavProps {
  tree: Root;
}

export function ChapterNav({ tree }: ChapterNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav}>
      <ul className={styles.chapterItems}>
        {tree.children.map(item => {
          if (item.type === 'separator') return null;

          if (item.type === 'folder') {
            return (
              <li key={item.name?.toString()} className={styles.chapter}>
                <span className={styles.chapterLabel}>
                  {item.name}
                </span>
                <ul className={styles.chapterItems}>
                  {item.children.map(child => (
                    <ChapterItem
                      key={child.type === 'page' ? child.url : (child.name?.toString() ?? '')}
                      item={child}
                      pathname={pathname}
                    />
                  ))}
                </ul>
              </li>
            );
          }

          return (
            <ChapterItem
              key={item.url ?? item.name?.toString() ?? ''}
              item={item}
              pathname={pathname}
            />
          );
        })}
      </ul>
    </nav>
  );
}

function ChapterItem({
  item,
  pathname
}: {
  item: Node;
  pathname: string;
}) {
  if (item.type === 'separator') return null;

  if (item.type === 'folder') {
    return (
      <li>
        <span className={styles.subLabel}>{item.name}</span>
        <ul className={styles.chapterItems}>
          {item.children.map(child => (
            <ChapterItem
              key={child.type === 'page' ? child.url : (child.name?.toString() ?? '')}
              item={child}
              pathname={pathname}
            />
          ))}
        </ul>
      </li>
    );
  }

  const isActive = pathname === item.url;
  const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;

  return (
    <li>
      <RouterLink
        to={item.url ?? '#'}
        className={`${styles.link} ${isActive ? styles.active : ''}`}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span>{item.name}</span>
      </RouterLink>
    </li>
  );
}
