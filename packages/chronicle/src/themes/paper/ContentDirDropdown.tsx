import { ChevronDownIcon } from '@/components/ui/icons';
import { Button, Menu } from '@raystack/apsara';
import { useLocation, useNavigate } from 'react-router';
import { getLandingEntries } from '@/lib/config';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';

export function ContentDirDropdown() {
  const { config, version } = usePageContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const entries = getLandingEntries(config, version.dir);
  if (entries.length <= 1) return null;

  const activeDir = getActiveContentDir(pathname, config);
  const activeEntry =
    entries.find(e => e.contentDir === activeDir) ?? entries[0];

  return (
    <Menu>
      <Menu.Trigger
        render={
          <Button
            size='small'
            variant='outline'
            color='neutral'
            style={{ width: '100%' }}
            trailingIcon={<ChevronDownIcon width={14} height={14} />}
          />
        }
      >
        {activeEntry.label}
      </Menu.Trigger>
      <Menu.Content>
        {entries.map(entry => (
          <Menu.Item
            key={entry.href}
            onClick={() => navigate(entry.href)}
          >
            {entry.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
