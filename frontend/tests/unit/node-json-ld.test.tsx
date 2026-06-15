import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NodeJsonLd } from '@/components/seo/node-json-ld';
import type { PublicNode } from '@/lib/data/public/nodes';

function nodeOf(partial: Partial<PublicNode>): PublicNode {
  return {
    id: '1',
    slug: 'x',
    title: 'X',
    description: null,
    node_type: 'party',
    verification: 'verified',
    ...partial,
  };
}

describe('node json-ld', () => {
  it('émet un JSON-LD schema.org typé Organization pour un parti', () => {
    const { container } = render(
      <NodeJsonLd
        node={nodeOf({ slug: 'rn', title: 'Rassemblement national' })}
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();

    const data = JSON.parse(script?.innerHTML ?? '{}') as Record<
      string,
      unknown
    >;
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('Rassemblement national');
    expect(data.url).toBe('/n/rn');
  });

  it('mappe un candidat sur Person et inclut la description', () => {
    const { container } = render(
      <NodeJsonLd
        node={nodeOf({ node_type: 'candidate', description: 'Biographie' })}
      />,
    );
    const data = JSON.parse(
      container.querySelector('script')?.innerHTML ?? '{}',
    ) as Record<string, unknown>;
    expect(data['@type']).toBe('Person');
    expect(data.description).toBe('Biographie');
  });
});
