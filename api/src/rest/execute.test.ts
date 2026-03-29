import { describe, it, expect, vi } from 'vitest';
import type { AgentEntry, ExecutionResult } from '../types.js';
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

const MOCK_SUMMARY: ExecutionResult = {
  version: 'v1',
  agent: 'test-agent',
  task: 'say hello',
  result: { greeting: 'Hello!' },
  metadata: {
    model: 'claude-sonnet-4-20250514',
    tokens_in: 10,
    tokens_out: 5,
    duration_ms: 100,
    execution_id: 'exec_test',
  },
};

function createMockEngine() {
  return {
    async *executeStream() {
      yield { type: 'token' as const, data: 'Hello ' };
      yield { type: 'token' as const, data: 'world!' };
      yield { type: 'summary' as const, data: MOCK_SUMMARY };
    },
    buildSystemPrompt: vi.fn(),
    resolveModel: vi.fn(),
    resolveMaxTokens: vi.fn(),
    execute: vi.fn(),
  };
}

function makeApp(engine = createMockEngine()) {
  const catalog = new Catalog([AGENT]);
  return createApp(catalog, engine as any);
}

describe('POST /v1/agents/:slug/execute', () => {
  it('streams SSE events for a valid request', async () => {
    const app = makeApp();

    const res = await app.request('/v1/agents/test-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'say hello' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const text = await res.text();
    expect(text).toContain('event: token');
    expect(text).toContain('data: Hello ');
    expect(text).toContain('event: summary');
  });

  it('returns 404 for unknown agent', async () => {
    const app = makeApp();

    const res = await app.request('/v1/agents/nonexistent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'hello' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('AGENT_NOT_FOUND');
  });

  it('returns 422 when task is missing', async () => {
    const app = makeApp();

    const res = await app.request('/v1/agents/test-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when task is empty string', async () => {
    const app = makeApp();

    const res = await app.request('/v1/agents/test-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: '   ' }),
    });

    expect(res.status).toBe(422);
  });

  it('streams error events from engine', async () => {
    const errorEngine = {
      async *executeStream() {
        yield { type: 'error' as const, data: { code: 'MODEL_ERROR', message: 'Rate limited', details: {} } };
      },
      buildSystemPrompt: vi.fn(),
      resolveModel: vi.fn(),
      resolveMaxTokens: vi.fn(),
      execute: vi.fn(),
    };

    const app = makeApp(errorEngine);

    const res = await app.request('/v1/agents/test-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'fail please' }),
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('event: error');
    expect(text).toContain('MODEL_ERROR');
  });
});
