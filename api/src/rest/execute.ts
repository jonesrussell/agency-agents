import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { AgentApiError } from '../types.js';
import type { Catalog } from '../catalog/catalog.js';
import type { ExecutionEngine } from '../execution/engine.js';

export function executeRoutes(catalog: Catalog, engine: ExecutionEngine) {
  const router = new Hono();

  router.post('/v1/agents/:slug/execute', async (c) => {
    const slug = c.req.param('slug');
    const agent = catalog.get(slug);

    if (!agent) {
      throw new AgentApiError('AGENT_NOT_FOUND', 404, `Agent '${slug}' not found`);
    }

    const body = await c.req.json().catch(() => null);

    if (!body || typeof body.task !== 'string' || !body.task.trim()) {
      throw new AgentApiError('VALIDATION_ERROR', 422, 'Field "task" is required and must be a non-empty string');
    }

    const { task, context, model } = body;

    return streamSSE(c, async (stream) => {
      for await (const event of engine.executeStream(agent, task, context, model)) {
        await stream.writeSSE({
          event: event.type,
          data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
        });
      }
    });
  });

  return router;
}
