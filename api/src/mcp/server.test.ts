import { describe, it, expect, vi } from 'vitest';
import { Catalog } from '../catalog/catalog.js';
import { createMcpTools } from './server.js';
import type { AgentEntry, ExecutionResult } from '../types.js';

const MOCK_AGENT: AgentEntry = {
  slug: 'test-specialist',
  name: 'Test Specialist',
  division: 'engineering',
  specialty: 'Testing',
  whenToUse: 'When you need tests written',
  emoji: '🧪',
  promptPath: '/prompts/test-specialist.md',
  promptContent: 'You are a testing specialist. Write thorough tests.',
};

const MOCK_AGENT_2: AgentEntry = {
  slug: 'review-specialist',
  name: 'Review Specialist',
  division: 'quality',
  specialty: 'Code Review',
  whenToUse: 'When you need code reviewed',
  emoji: '🔍',
  promptPath: '/prompts/review-specialist.md',
  promptContent: 'You are a code review specialist.',
};

const MOCK_RESULT: ExecutionResult = {
  version: 'v1',
  agent: 'test-specialist',
  task: 'Write unit tests',
  result: { tests_written: 5, coverage: '92%' },
  metadata: {
    model: 'claude-sonnet-4-20250514',
    tokens_in: 100,
    tokens_out: 200,
    duration_ms: 1500,
    execution_id: 'exec_abc123',
  },
};

function createTestTools(agents: AgentEntry[] = [MOCK_AGENT, MOCK_AGENT_2]) {
  const catalog = new Catalog(agents);
  const mockEngine = {
    execute: vi.fn().mockResolvedValue(MOCK_RESULT),
  };
  const tools = createMcpTools(catalog, mockEngine as any);
  return { catalog, mockEngine, tools };
}

describe('MCP Server - list_agents', () => {
  it('lists all agents with no filters', async () => {
    const { tools } = createTestTools();
    const listTool = tools.find((t) => t.name === 'list_agents')!;

    const result = await listTool.handler({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.agents).toHaveLength(2);
    expect(parsed.total).toBe(2);
    expect(parsed.agents[0].slug).toBe('review-specialist');
    expect(parsed.agents[1].slug).toBe('test-specialist');
    expect(result.isError).toBeUndefined();
  });

  it('filters by division', async () => {
    const { tools } = createTestTools();
    const listTool = tools.find((t) => t.name === 'list_agents')!;

    const result = await listTool.handler({ division: 'engineering' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].slug).toBe('test-specialist');
  });

  it('filters by query string', async () => {
    const { tools } = createTestTools();
    const listTool = tools.find((t) => t.name === 'list_agents')!;

    const result = await listTool.handler({ query: 'review' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].slug).toBe('review-specialist');
  });

  it('returns empty list for no matches', async () => {
    const { tools } = createTestTools();
    const listTool = tools.find((t) => t.name === 'list_agents')!;

    const result = await listTool.handler({ division: 'nonexistent' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.agents).toHaveLength(0);
    expect(parsed.total).toBe(0);
  });

  it('does not include promptContent or promptPath in agent summaries', async () => {
    const { tools } = createTestTools();
    const listTool = tools.find((t) => t.name === 'list_agents')!;

    const result = await listTool.handler({});
    const parsed = JSON.parse(result.content[0].text);

    for (const agent of parsed.agents) {
      expect(agent).not.toHaveProperty('promptContent');
      expect(agent).not.toHaveProperty('promptPath');
    }
  });
});

describe('MCP Server - execute_agent', () => {
  it('executes an agent and returns the result', async () => {
    const { tools, mockEngine } = createTestTools();
    const execTool = tools.find((t) => t.name === 'execute_agent')!;

    const result = await execTool.handler({
      agent: 'test-specialist',
      task: 'Write unit tests',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.version).toBe('v1');
    expect(parsed.agent).toBe('test-specialist');
    expect(parsed.result.tests_written).toBe(5);
    expect(result.isError).toBeUndefined();
    expect(mockEngine.execute).toHaveBeenCalledOnce();
  });

  it('passes context to the engine', async () => {
    const { tools, mockEngine } = createTestTools();
    const execTool = tools.find((t) => t.name === 'execute_agent')!;

    const context = { language: 'typescript', framework: 'vitest' };
    await execTool.handler({
      agent: 'test-specialist',
      task: 'Write unit tests',
      context,
    });

    expect(mockEngine.execute).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'test-specialist' }),
      'Write unit tests',
      context,
    );
  });

  it('returns error for unknown agent', async () => {
    const { tools } = createTestTools();
    const execTool = tools.find((t) => t.name === 'execute_agent')!;

    const result = await execTool.handler({
      agent: 'nonexistent',
      task: 'Do something',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(parsed.code).toBe('AGENT_NOT_FOUND');
  });

  it('returns error when engine throws', async () => {
    const catalog = new Catalog([MOCK_AGENT]);
    const mockEngine = {
      execute: vi.fn().mockRejectedValue(new Error('RATE_LIMITED: Too many requests')),
    };
    const tools = createMcpTools(catalog, mockEngine as any);
    const execTool = tools.find((t) => t.name === 'execute_agent')!;

    const result = await execTool.handler({
      agent: 'test-specialist',
      task: 'Write unit tests',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(parsed.code).toBe('EXECUTION_FAILED');
    expect(parsed.message).toContain('RATE_LIMITED');
  });

  it('defaults context to empty object', async () => {
    const { tools, mockEngine } = createTestTools();
    const execTool = tools.find((t) => t.name === 'execute_agent')!;

    await execTool.handler({
      agent: 'test-specialist',
      task: 'Write unit tests',
    });

    expect(mockEngine.execute).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'test-specialist' }),
      'Write unit tests',
      {},
    );
  });
});

describe('MCP Server - get_agent_prompt', () => {
  it('returns the raw prompt content', async () => {
    const { tools } = createTestTools();
    const promptTool = tools.find((t) => t.name === 'get_agent_prompt')!;

    const result = await promptTool.handler({ agent: 'test-specialist' });

    expect(result.content[0].text).toBe(
      'You are a testing specialist. Write thorough tests.',
    );
    expect(result.isError).toBeUndefined();
  });

  it('returns error for unknown agent', async () => {
    const { tools } = createTestTools();
    const promptTool = tools.find((t) => t.name === 'get_agent_prompt')!;

    const result = await promptTool.handler({ agent: 'nonexistent' });
    const parsed = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(parsed.code).toBe('AGENT_NOT_FOUND');
  });

  it('returns raw text, not JSON-wrapped', async () => {
    const { tools } = createTestTools();
    const promptTool = tools.find((t) => t.name === 'get_agent_prompt')!;

    const result = await promptTool.handler({ agent: 'test-specialist' });

    // Should NOT be valid JSON (it's raw prompt text)
    expect(() => JSON.parse(result.content[0].text)).toThrow();
  });
});

describe('MCP Server - tool definitions', () => {
  it('exports exactly 3 tools', () => {
    const { tools } = createTestTools();
    expect(tools).toHaveLength(3);
  });

  it('has the expected tool names', () => {
    const { tools } = createTestTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(['list_agents', 'execute_agent', 'get_agent_prompt']);
  });
});
