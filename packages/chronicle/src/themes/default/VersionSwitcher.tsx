import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Badge, Button, DropdownMenu, Flex } from '@raystack/apsara';
import { useNavigate } from 'react-router';
import { getAllVersions } from '@/lib/config';
import { getVersionHomeHref } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';

export function VersionSwitcher() {
  const { config, version } = usePageContext();
  const navigate = useNavigate();

  if (!config.versions?.length) return null;

  const versions = getAllVersions(config);
  const active = versions.find(v =>
    v.isLatest ? version.dir === null : v.dir === version.dir,
  );

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          size='small'
          variant='outline'
          color='neutral'
          trailingIcon={<ChevronDownIcon width={14} height={14} />}
        >
          <Flex gap='small' align='center'>
            {active?.label ?? 'Version'}
            {active?.badge ? (
              <Badge variant={active.badge.variant} size='micro'>
                {active.badge.label}
              </Badge>
            ) : null}
          </Flex>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {versions.map(v => (
          <DropdownMenu.Item
            key={v.dir ?? '_latest'}
            onClick={() => navigate(getVersionHomeHref(config, v.dir))}
          >
            <Flex gap='small' align='center'>
              {v.label}
              {v.badge ? (
                <Badge variant={v.badge.variant} size='micro'>
                  {v.badge.label}
                </Badge>
              ) : null}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
