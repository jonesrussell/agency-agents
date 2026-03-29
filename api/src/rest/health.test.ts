import { describe, it, expect } from 'vitest';
import type { AgentEntry } from '../types.js';
import { Catalog } from '../catalog/catalog.js';
import { createApp } from './app.js';

const AGENT: AgentEntry = {
  slug: 'test-agent',
  name: 'Test Agent',
  division: 'engineering',
  specialty: 'testing',
  whenToUse: 'When you need tests',
  emoji: '🧪',
  promptPath: 'prompts/test.md',
  promptContent: 'You are a test agent.',
};

describe('GET /v1/health', () => {
  it('returns status ok with agent count', async () => {
    const catalog = new Catalog([AGENT]);
    const app = createApp(catalog, null as any);

    const res = await app.request('/v1/health');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      version: 'v1',
      status: 'ok',
      agents_loaded: 1,
    });
  });

  it('returns 0 agents when catalog is empty', async () => {
    const catalog = new Catalog([]);
    const app = createApp(catalog, null as any);

    const res = await app.request('/v1/health');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.agents_loaded).toBe(0);
  });
});
