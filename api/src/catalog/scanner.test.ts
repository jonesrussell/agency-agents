import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { scanPrompts } from './scanner.js';
import { join } from 'path';

const FIXTURES = join(import.meta.dirname, '__fixtures__');

describe('scanPrompts', () => {
  it('scans markdown files and extracts metadata', async () => {
    const entries = await scanPrompts(FIXTURES);

    expect(entries).toHaveLength(1);
    expect(entries[0].slug).toBe('sales-deal-strategist');
    expect(entries[0].name).toBe('Deal Strategist');
    expect(entries[0].division).toBe('sales');
    expect(entries[0].promptContent).toContain('MEDDPICC');
    expect(entries[0].promptPath).toContain('sales/sales-deal-strategist.md');
  });

  it('extracts specialty from description frontmatter', async () => {
    const entries = await scanPrompts(FIXTURES);
    expect(entries[0].specialty).toBe(
      'MEDDPICC qualification and win planning',
    );
  });

  it('extracts whenToUse from ## When to Use section', async () => {
    const entries = await scanPrompts(FIXTURES);
    expect(entries[0].whenToUse).toContain('Scoring deals');
  });

  it('returns empty array for directory with no markdown', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'scanner-test-'));
    try {
      const entries = await scanPrompts(emptyDir);
      expect(entries).toEqual([]);
    } finally {
      await rm(emptyDir, { recursive: true });
    }
  });
});
