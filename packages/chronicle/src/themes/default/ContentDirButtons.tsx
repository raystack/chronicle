import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button, Menu, Flex } from '@raystack/apsara';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { getLandingEntries } from '@/lib/config';
import { getActiveContentDir, splitContentButtons } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';

const MAX_VISIBLE = 3;

export function ContentDirButtons() {
  const { config, version } = usePageContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const entries = getLandingEntries(config, version.dir);
  if (entries.length <= 1) return null;

  const active = getActiveContentDir(pathname, config);
  const { visible, overflow } = splitContentButtons(entries, MAX_VISIBLE);

  return (
    <Flex gap={3} align='center'>
      {visible.map(entry => (
        <RouterLink
          key={entry.href}
          to={entry.href}
          style={{ textDecoration: 'none' }}
        >
          <Button
            size='small'
            variant={active === entry.contentDir ? 'solid' : 'outline'}
            color='neutral'
          >
            {entry.label}
          </Button>
        </RouterLink>
      ))}
      {overflow.length > 0 ? (
        <Menu>
          <Menu.Trigger
            render={
              <Button
                size='small'
                variant='outline'
                color='neutral'
                trailingIcon={<ChevronDownIcon width={14} height={14} />}
              />
            }
          >
            More
          </Menu.Trigger>
          <Menu.Content>
            {overflow.map(entry => (
              <Menu.Item
                key={entry.href}
                onClick={() => navigate(entry.href)}
              >
                {entry.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
      ) : null}
    </Flex>
  );
}
