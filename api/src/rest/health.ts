import { Hono } from 'hono';
import type { Catalog } from '../catalog/catalog.js';

export function healthRoutes(catalog: Catalog) {
  const router = new Hono();

  router.get('/v1/health', (c) => {
    return c.json({
      version: 'v1',
      status: 'ok',
      agents_loaded: catalog.count,
    });
  });

  return router;
}
