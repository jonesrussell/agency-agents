import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { AgentApiError } from '../types.js';
import type { AppConfig } from '../types.js';
import type { Catalog } from '../catalog/catalog.js';
import type { ExecutionEngine } from '../execution/engine.js';

const MAX_CONTEXT_SIZE = 50000;

const executeBodySchema = z.object({
  task: z.string().trim().min(1, 'Field "task" is required and must be a non-empty string'),
  context: z.record(z.unknown()).optional(),
  model_override: z.string().optional(),
}).strict();

export function executeRoutes(catalog: Catalog, engine: ExecutionEngine, config?: AppConfig) {
  const router = new Hono();

  router.post('/v1/agents/:slug/execute', async (c) => {
    const slug = c.req.param('slug');
    const agent = catalog.get(slug);

    if (!agent) {
      throw new AgentApiError('AGENT_NOT_FOUND', 404, `Agent '${slug}' not found`);
    }

    const body = await c.req.json().catch(() => null);

    const parsed = executeBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid request body';
      throw new AgentApiError('VALIDATION_ERROR', 422, firstError);
    }

    const { task, context, model_override } = parsed.data;

    if (context && JSON.stringify(context).length > MAX_CONTEXT_SIZE) {
      throw new AgentApiError('VALIDATION_ERROR', 422, `Context exceeds maximum size of ${MAX_CONTEXT_SIZE} bytes`);
    }

    // Validate model_override against allowed_models
    let resolvedModel: string | undefined;
    if (model_override) {
      const allowedModels = config?.execution?.allowed_models ?? [];
      if (allowedModels.length > 0 && allowedModels.includes(model_override)) {
        resolvedModel = model_override;
      }
      // If allowed_models is empty or model not in list, strip the override
    }

    return streamSSE(c, async (stream) => {
      for await (const event of engine.executeStream(agent, task, context, resolvedModel)) {
        await stream.writeSSE({
          event: event.type,
          data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
        });
      }
    });
  });

  return router;
}
