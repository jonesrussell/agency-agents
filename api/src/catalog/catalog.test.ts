import { describe, it, expect, beforeEach } from 'vitest';
import { Catalog } from './catalog.js';
import type { AgentEntry } from '../types.js';

const AGENTS: AgentEntry[] = [
  {
    slug: 'sales-deal-strategist',
    name: 'Deal Strategist',
    division: 'sales',
    specialty: 'MEDDPICC qualification',
    whenToUse: 'Scoring deals, pipeline risk',
    emoji: '♟️',
    promptPath: 'sales/sales-deal-strategist.md',
    promptContent: '# Deal Strategist\nYou are...',
  },
  {
    slug: 'product-feedback-synthesizer',
    name: 'Feedback Synthesizer',
    division: 'product',
    specialty: 'User feedback analysis',
    whenToUse: 'Feedback analysis, user insights',
    emoji: '💬',
    promptPath: 'product/product-feedback-synthesizer.md',
    promptContent: '# Feedback Synthesizer\nYou are...',
  },
  {
    slug: 'sales-pipeline-analyst',
    name: 'Pipeline Analyst',
    division: 'sales',
    specialty: 'Forecasting, pipeline health',
    whenToUse: 'Pipeline reviews, forecast accuracy',
    emoji: '📊',
    promptPath: 'sales/sales-pipeline-analyst.md',
    promptContent: '# Pipeline Analyst\nYou are...',
  },
];

describe('Catalog', () => {
  let catalog: Catalog;

  beforeEach(() => {
    catalog = new Catalog(AGENTS);
  });

  it('returns all agents', () => {
    const result = catalog.list({});
    expect(result.agents).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('filters by division', () => {
    const result = catalog.list({ division: 'sales' });
    expect(result.agents).toHaveLength(2);
    expect(result.agents.every((a) => a.division === 'sales')).toBe(true);
  });

  it('searches by keyword', () => {
    const result = catalog.list({ q: 'feedback' });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].slug).toBe('product-feedback-synthesizer');
  });

  it('paginates with limit and offset', () => {
    const result = catalog.list({ limit: 1, offset: 1 });
    expect(result.agents).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it('gets agent by slug', () => {
    const agent = catalog.get('sales-deal-strategist');
    expect(agent).toBeDefined();
    expect(agent!.name).toBe('Deal Strategist');
    expect(agent!.promptContent).toContain('Deal Strategist');
  });

  it('returns undefined for unknown slug', () => {
    expect(catalog.get('nonexistent')).toBeUndefined();
  });

  it('reports count', () => {
    expect(catalog.count).toBe(3);
  });

  it('deduplicates slugs, keeping the first entry', () => {
    const duplicateEntries: AgentEntry[] = [
      {
        slug: 'deal-strategist',
        name: 'Deal Strategist (sales)',
        division: 'sales',
        specialty: 'MEDDPICC qualification',
        whenToUse: 'Scoring deals',
        emoji: '♟️',
        promptPath: 'sales/deal-strategist.md',
        promptContent: '# Deal Strategist from sales',
      },
      {
        slug: 'deal-strategist',
        name: 'Deal Strategist (biz-dev)',
        division: 'biz-dev',
        specialty: 'Partnership deals',
        whenToUse: 'Partnership scoring',
        emoji: '🤝',
        promptPath: 'biz-dev/deal-strategist.md',
        promptContent: '# Deal Strategist from biz-dev',
      },
    ];

    const dupCatalog = new Catalog(duplicateEntries);
    expect(dupCatalog.count).toBe(1);

    const agent = dupCatalog.get('deal-strategist');
    expect(agent).toBeDefined();
    expect(agent!.division).toBe('sales');
    expect(agent!.promptPath).toBe('sales/deal-strategist.md');
  });
});
