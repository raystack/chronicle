import { ChevronDownIcon } from '@/components/ui/icons';
import { Badge, Button, Menu, Flex, Text } from '@raystack/apsara';
import { useNavigate } from 'react-router';
import { getAllVersions } from '@/lib/config';
import { getVersionHomeHref } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';

export function VersionSwitcher() {
  const { config, version } = usePageContext();
  const navigate = useNavigate();

  // No versions to switch between. Surface `latest.label` as a static label if
  // one is configured — a dropdown with a single dead option would imply there
  // is somewhere to switch to.
  if (!config.versions?.length) {
    const latestLabel = config.latest?.label;
    if (!latestLabel) return null;
    return (
      <Text size='small' variant='secondary'>
        {latestLabel}
      </Text>
    );
  }

  const versions = getAllVersions(config);
  const active = versions.find(v =>
    v.isLatest ? version.dir === null : v.dir === version.dir,
  );

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
        <Flex gap={3} align='center' justify='start'>
          {active?.label ?? 'Version'}
          {active?.badge ? (
            <Badge variant={active.badge.variant} size='micro'>
              {active.badge.label}
            </Badge>
          ) : null}
        </Flex>
      </Menu.Trigger>
      <Menu.Content>
        {versions.map(v => (
          <Menu.Item
            key={v.dir ?? '_latest'}
            onClick={() => navigate(getVersionHomeHref(config, v.dir))}
          >
            <Flex gap={3} align='center'>
              {v.label}
              {v.badge ? (
                <Badge variant={v.badge.variant} size='micro'>
                  {v.badge.label}
                </Badge>
              ) : null}
            </Flex>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
