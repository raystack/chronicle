import type { Node, Folder } from 'fumadocs-core/page-tree';

const NodeType = {
  Page: 'page',
  Folder: 'folder',
} as const;

export function parentPath(url: string): string {
  const parts = url.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

export function getFolderPath(node: Folder): string | null {
  if (node.index) return node.index.url;
  for (const child of node.children) {
    if (child.type === NodeType.Page) return parentPath(child.url);
  }
  for (const child of node.children) {
    if (child.type === NodeType.Folder) {
      const childPath = getFolderPath(child as Folder);
      if (childPath) return parentPath(childPath);
    }
  }
  return null;
}
