'use client';

import {
  ChevronDownIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Button, Menu } from '@raystack/apsara';
import { useCallback } from 'react';

function mdUrl() {
  return `${window.location.origin}${window.location.pathname}.md`;
}

async function copyMd() {
  try {
    const res = await fetch(mdUrl());
    const text = await res.text();
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export function OpenInAI() {
  const onCopy = useCallback(() => {
    void copyMd();
  }, []);
  const onView = useCallback(() => {
    window.open(mdUrl(), '_blank', 'noopener,noreferrer');
  }, []);
  const onChatGPT = useCallback(() => {
    const q = encodeURIComponent(`Read ${mdUrl()}`);
    window.open(`https://chatgpt.com/?q=${q}`, '_blank', 'noopener,noreferrer');
  }, []);
  const onClaude = useCallback(() => {
    const q = encodeURIComponent(`Read ${mdUrl()}`);
    window.open(`https://claude.ai/new?q=${q}`, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <Menu>
      <Menu.Trigger
        render={
          <Button
            size='small'
            variant='outline'
            color='neutral'
            leadingIcon={<SparklesIcon width={12} height={12} />}
            trailingIcon={<ChevronDownIcon width={12} height={12} />}
          />
        }
      >
        Open in AI
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onClick={onCopy}>
          <ClipboardDocumentIcon width={14} height={14} />
          Copy as MD
        </Menu.Item>
        <Menu.Item onClick={onView}>
          <DocumentTextIcon width={14} height={14} />
          View MD
        </Menu.Item>
        <Menu.Item onClick={onChatGPT}>Open in ChatGPT</Menu.Item>
        <Menu.Item onClick={onClaude}>Open in Claude</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}
