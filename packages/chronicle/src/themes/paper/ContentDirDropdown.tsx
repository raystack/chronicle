import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button, DropdownMenu } from '@raystack/apsara';
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
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          size='small'
          variant='outline'
          color='neutral'
          width='100%'
          trailingIcon={<ChevronDownIcon width={14} height={14} />}
        >
          {activeEntry.label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {entries.map(entry => (
          <DropdownMenu.Item
            key={entry.href}
            onClick={() => navigate(entry.href)}
          >
            {entry.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
