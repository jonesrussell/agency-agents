import Anthropic from '@anthropic-ai/sdk';
import { extractResult } from './result-extractor.js';
import { log } from '../observability/logger.js';
import type {
  AgentEntry,
  ExecutionConfig,
  ExecutionResult,
  ExecutionMetadata,
} from '../types.js';
import type { MetricsEmitter } from '../observability/metrics.js';

const RESULT_INSTRUCTION = `

---

After completing the task, end your response with a JSON block wrapped in <result>...</result> tags containing your key findings in a structured format. Example:

<result>
{"key_finding": "value", "recommendations": ["item1", "item2"]}
</result>`;

export class ExecutionEngine {
  private readonly client: Anthropic;
  private readonly config: ExecutionConfig;
  private readonly metrics: MetricsEmitter;

  constructor(config: ExecutionConfig, metrics: MetricsEmitter) {
    this.config = config;
    this.metrics = metrics;
    this.client = new Anthropic();
  }

  buildSystemPrompt(agent: AgentEntry): string {
    return agent.promptContent + RESULT_INSTRUCTION;
  }

  resolveModel(slug: string): string {
    return (
      this.config.agent_overrides[slug]?.default_model ??
      this.config.default_model
    );
  }

  resolveMaxTokens(slug: string): number {
    return (
      this.config.agent_overrides[slug]?.max_tokens ?? this.config.max_tokens
    );
  }

  async *executeStream(
    agent: AgentEntry,
    task: string,
    context: Record<string, unknown> = {},
    modelOverride?: string,
  ): AsyncGenerator<
    | { type: 'token'; data: string }
    | { type: 'log'; data: Record<string, unknown> }
    | {
        type: 'error';
        data: {
          code: string;
          message: string;
          details: Record<string, unknown>;
        };
      }
    | { type: 'summary'; data: ExecutionResult }
  > {
    const model = modelOverride ?? this.resolveModel(agent.slug);
    const maxTokens = this.resolveMaxTokens(agent.slug);
    const executionId = `exec_${Date.now().toString(36)}`;
    const startTime = Date.now();

    yield {
      type: 'log',
      data: {
        type: 'started',
        agent: agent.slug,
        model,
        execution_id: executionId,
      },
    };

    let fullText = '';
    let tokensIn = 0;
    let tokensOut = 0;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      const userMessage =
        context && Object.keys(context).length > 0
          ? `Context:\n${JSON.stringify(context, null, 2)}\n\nTask:\n${task}`
          : task;

      const stream = this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature: this.config.temperature,
        system: this.buildSystemPrompt(agent),
        messages: [{ role: 'user', content: userMessage }],
      }, { signal: controller.signal });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullText += event.delta.text;
          yield { type: 'token', data: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      tokensIn = finalMessage.usage.input_tokens;
      tokensOut = finalMessage.usage.output_tokens;

      const durationMs = Date.now() - startTime;
      const result = extractResult(fullText);

      const metadata: ExecutionMetadata = {
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        duration_ms: durationMs,
        execution_id: executionId,
      };

      this.metrics.executionComplete({
        agent: agent.slug,
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        duration_ms: durationMs,
        status: 'success',
      });

      yield {
        type: 'summary',
        data: {
          version: 'v1',
          agent: agent.slug,
          task,
          result,
          metadata,
        },
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const message = isTimeout
        ? `Execution timed out after ${this.config.timeout_ms}ms`
        : err instanceof Error ? err.message : 'Unknown error';
      const code = isTimeout
        ? 'TIMEOUT'
        : err instanceof Anthropic.RateLimitError
          ? 'RATE_LIMITED'
          : err instanceof Anthropic.APIError
            ? 'MODEL_ERROR'
            : 'INTERNAL_ERROR';

      log('error', 'execution_failed', {
        agent: agent.slug,
        execution_id: executionId,
        code,
        message,
      });

      this.metrics.executionComplete({
        agent: agent.slug,
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        duration_ms: durationMs,
        status: 'error',
      });

      yield {
        type: 'error',
        data: { code, message, details: { execution_id: executionId } },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async execute(
    agent: AgentEntry,
    task: string,
    context: Record<string, unknown> = {},
    modelOverride?: string,
  ): Promise<ExecutionResult> {
    for await (const event of this.executeStream(
      agent,
      task,
      context,
      modelOverride,
    )) {
      if (event.type === 'summary') return event.data;
      if (event.type === 'error') {
        throw new Error(`${event.data.code}: ${event.data.message}`);
      }
    }
    throw new Error('INTERNAL_ERROR: Stream ended without summary or error');
  }
}
