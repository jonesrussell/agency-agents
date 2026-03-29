import { describe, it, expect } from 'vitest';
import type { AgentEntry } from '../types.js';
import { Catalog } from '../catalog/catalog.js';
import { createApp } from './app.js';

const AGENTS: AgentEntry[] = [
  {
    slug: 'code-reviewer',
    name: 'Code Reviewer',
    division: 'engineering',
    specialty: 'Code review and quality',
    whenToUse: 'When you need a code review',
    emoji: '🔍',
    promptPath: 'prompts/code-reviewer.md',
    promptContent: 'You are a code reviewer.',
  },
  {
    slug: 'writer',
    name: 'Content Writer',
    division: 'marketing',
    specialty: 'Blog posts and copy',
    whenToUse: 'When you need written content',
    emoji: '✍️',
    promptPath: 'prompts/writer.md',
    promptContent: 'You are a content writer.',
  },
  {
    slug: 'debugger',
    name: 'Debugger',
    division: 'engineering',
    specialty: 'Bug diagnosis',
    whenToUse: 'When you need to find bugs',
    emoji: '🐛',
    promptPath: 'prompts/debugger.md',
    promptContent: 'You are a debugger.',
  },
];

function makeApp() {
  const catalog = new Catalog(AGENTS);
  return createApp(catalog, null as any);
}

describe('GET /v1/agents', () => {
  it('lists all agents with pagination', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.version).toBe('v1');
    expect(body.total).toBe(3);
    expect(body.agents).toHaveLength(3);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it('filters by division', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents?division=engineering');
    const body = await res.json();

    expect(body.total).toBe(2);
    expect(body.agents.every((a: any) => a.division === 'engineering')).toBe(true);
  });

  it('searches by query string', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents?q=bug');
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.agents[0].slug).toBe('debugger');
  });

  it('paginates with limit and offset', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents?limit=1&offset=1');
    const body = await res.json();

    expect(body.total).toBe(3);
    expect(body.agents).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(1);
  });

  it('does not include prompt content in list', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents');
    const body = await res.json();

    for (const agent of body.agents) {
      expect(agent).not.toHaveProperty('promptContent');
      expect(agent).not.toHaveProperty('prompt');
      expect(agent).not.toHaveProperty('promptPath');
    }
  });
});

describe('GET /v1/agents/:slug', () => {
  it('returns agent detail with prompt', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents/code-reviewer');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.version).toBe('v1');
    expect(body.agent.slug).toBe('code-reviewer');
    expect(body.agent.prompt).toBe('You are a code reviewer.');
    expect(body.agent.name).toBe('Code Reviewer');
  });

  it('returns 404 for unknown agent', async () => {
    const app = makeApp();
    const res = await app.request('/v1/agents/nonexistent');
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('AGENT_NOT_FOUND');
  });
});
