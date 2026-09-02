import type { Item, Node, Root } from 'fumadocs-core/page-tree';
import { Link as RouterLink, useLocation } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { shortName } from '@/lib/tree-utils';
import styles from './Layout.module.css';

const iconMap: Record<string, React.ReactNode> = {
  'method-get': <MethodBadge method='GET' size='micro' />,
  'method-post': <MethodBadge method='POST' size='micro' />,
  'method-put': <MethodBadge method='PUT' size='micro' />,
  'method-delete': <MethodBadge method='DELETE' size='micro' />,
  'method-patch': <MethodBadge method='PATCH' size='micro' />
};

const MAX_DEPTH = 3;

function nodeKey(node: Node, index: number): string {
  if (node.type === 'page') return node.url;
  return `${node.name?.toString() ?? 'node'}-${index}`;
}

interface NavProps {
  tree: Root;
}

export function Nav({ tree }: NavProps) {
  return (
    <nav className={styles.nav} aria-label='Documentation'>
      {tree.children.map((node, index) => (
        <NavNode key={nodeKey(node, index)} node={node} depth={0} />
      ))}
    </nav>
  );
}

function NavNode({ node, depth }: { node: Node; depth: number }) {
  const { pathname } = useLocation();

  if (node.type === 'separator') {
    return <span className={styles.navLabel}>{node.name}</span>;
  }

  if (node.type === 'folder') {
    // `>` not `>=`, so depths 0 through MAX_DEPTH render — the default theme
    // draws the same range, and `>=` quietly hid a whole level of pages.
    if (depth > MAX_DEPTH) return null;
    // The top level reads as a printout section header; anything deeper is a
    // category line inside that section.
    const labelClass = depth === 0 ? styles.navLabel : styles.navSubLabel;
    return (
      <div className={depth === 0 ? styles.navGroup : undefined}>
        {node.index ? (
          <FolderIndexLink node={node.index} labelClass={labelClass} />
        ) : (
          <span className={labelClass}>{node.name}</span>
        )}
        <ul className={styles.navList}>
          {node.children.map((child, index) => (
            <li key={nodeKey(child, index)}>
              <NavNode node={child} depth={depth + 1} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const isActive = pathname === node.url;
  const icon = typeof node.icon === 'string' ? iconMap[node.icon] : node.icon;

  // A page can give the rail a shorter label than its title — a package or
  // command name. Where it does, the full title moves to the tooltip.
  const label = shortName(node) ?? node.name;
  const title = typeof node.name === 'string' ? node.name : undefined;

  return (
    <RouterLink
      to={node.url}
      className={styles.navLink}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      title={title}
    >
      {icon ? <span className={styles.navIcon}>{icon}</span> : null}
      <span className={styles.navLinkText}>{label}</span>
    </RouterLink>
  );
}

function FolderIndexLink({
  node,
  labelClass
}: {
  node: Item;
  labelClass: string;
}) {
  const { pathname } = useLocation();
  // A folder's index page is still a page: `attachShortNames` puts `short` on it
  // and it survives serialisation, so honour it here as well.
  const label = shortName(node) ?? node.name;
  return (
    <RouterLink
      to={node.url}
      className={labelClass}
      data-active={pathname === node.url}
      title={typeof node.name === 'string' ? node.name : undefined}
    >
      {label}
    </RouterLink>
  );
}
