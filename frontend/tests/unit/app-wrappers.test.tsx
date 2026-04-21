import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppButton } from '@/components/app/app-button';
import { AppTabs } from '@/components/app/app-tabs';

describe('app wrappers', () => {
  it('renders AppButton variants', () => {
    render(
      <div>
        <AppButton>Primary</AppButton>
        <AppButton variant="secondary">Secondary</AppButton>
      </div>,
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeTruthy();
  });

  it('renders AppTabs and disabled tab', () => {
    render(
      <AppTabs
        value="post"
        onValueChange={() => undefined}
        items={[
          { key: 'post', label: 'Post', content: <div>tab-post</div> },
          { key: 'poll', label: 'Sondage', content: <div>tab-poll</div> },
          {
            key: 'bet',
            label: 'Paris (bientot)',
            content: <div>tab-bet</div>,
            disabled: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Post' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Paris (bientot)' })).toBeTruthy();
  });
});
