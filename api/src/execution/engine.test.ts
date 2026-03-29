import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from './engine.js';
import type { ExecutionConfig, AgentEntry } from '../types.js';
import { ConsoleMetricsEmitter } from '../observability/metrics.js';

const MOCK_AGENT: AgentEntry = {
  slug: 'sales-deal-strategist',
  name: 'Deal Strategist',
  division: 'sales',
  specialty: 'MEDDPICC',
  whenToUse: 'Deal scoring',
  emoji: '♟️',
  promptPath: 'sales/sales-deal-strategist.md',
  promptContent:
    '---\nname: Deal Strategist\n---\n\nYou are a deal strategist.',
};

const CONFIG: ExecutionConfig = {
  default_model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  temperature: 0.7,
  timeout_ms: 60000,
  agent_overrides: {},
};

describe('ExecutionEngine', () => {
  it('constructs the system prompt with result extraction instruction', () => {
    const engine = new ExecutionEngine(CONFIG, new ConsoleMetricsEmitter());
    const prompt = engine.buildSystemPrompt(MOCK_AGENT);

    expect(prompt).toContain('You are a deal strategist');
    expect(prompt).toContain('<result>');
    expect(prompt).toContain('JSON');
  });

  it('resolves model from config with agent override', () => {
    const config: ExecutionConfig = {
      ...CONFIG,
      agent_overrides: {
        'sales-deal-strategist': { default_model: 'claude-opus-4-6' },
      },
    };
    const engine = new ExecutionEngine(config, new ConsoleMetricsEmitter());
    const model = engine.resolveModel('sales-deal-strategist');
    expect(model).toBe('claude-opus-4-6');
  });

  it('falls back to default model when no override', () => {
    const engine = new ExecutionEngine(CONFIG, new ConsoleMetricsEmitter());
    const model = engine.resolveModel('sales-deal-strategist');
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('resolves max_tokens from agent override', () => {
    const config: ExecutionConfig = {
      ...CONFIG,
      agent_overrides: {
        'sales-deal-strategist': { max_tokens: 8192 },
      },
    };
    const engine = new ExecutionEngine(config, new ConsoleMetricsEmitter());
    const tokens = engine.resolveMaxTokens('sales-deal-strategist');
    expect(tokens).toBe(8192);
  });
});
