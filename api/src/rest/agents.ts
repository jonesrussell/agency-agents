import { Hono } from 'hono';
import { AgentApiError } from '../types.js';
import type { Catalog } from '../catalog/catalog.js';

export function agentRoutes(catalog: Catalog) {
  const router = new Hono();

  router.get('/v1/agents', (c) => {
    const division = c.req.query('division');
    const q = c.req.query('q');
    const limit = Math.min(
      Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1),
      100,
    );
    const offset = Math.max(
      parseInt(c.req.query('offset') ?? '0', 10) || 0,
      0,
    );

    const result = catalog.list({ division, q, limit, offset });

    return c.json({
      version: 'v1',
      ...result,
    });
  });

  router.get('/v1/agents/:slug', (c) => {
    const slug = c.req.param('slug');
    const agent = catalog.get(slug);

    if (!agent) {
      throw new AgentApiError('AGENT_NOT_FOUND', 404, `Agent '${slug}' not found`);
    }

    return c.json({
      version: 'v1',
      agent: {
        slug: agent.slug,
        name: agent.name,
        division: agent.division,
        specialty: agent.specialty,
        whenToUse: agent.whenToUse,
        emoji: agent.emoji,
        prompt: agent.promptContent,
      },
    });
  });

  return router;
}
