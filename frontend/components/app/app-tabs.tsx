'use client';

import type { ReactNode } from 'react';
import {
  CatalystTabs,
  CatalystTabsList,
  CatalystTabsPanel,
  CatalystTabsPanels,
  CatalystTabsTrigger,
} from '@/components/catalyst/tabs';

interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
  content: ReactNode;
}

export function AppTabs({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
}) {
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );

  return (
    <CatalystTabs
      selectedIndex={selectedIndex}
      onChange={(index) => {
        onValueChange(items[index]?.key ?? items[0]?.key ?? '');
      }}
    >
      <CatalystTabsList>
        {items.map((item) => (
          <CatalystTabsTrigger key={item.key} disabled={item.disabled}>
            {item.label}
          </CatalystTabsTrigger>
        ))}
      </CatalystTabsList>
      <CatalystTabsPanels>
        {items.map((item) => (
          <CatalystTabsPanel key={`${item.key}-panel`}>
            {item.content}
          </CatalystTabsPanel>
        ))}
      </CatalystTabsPanels>
    </CatalystTabs>
  );
}
