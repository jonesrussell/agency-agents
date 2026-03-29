import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './error-handler.js';
import { healthRoutes } from './health.js';
import { agentRoutes } from './agents.js';
import { executeRoutes } from './execute.js';
import type { Catalog } from '../catalog/catalog.js';
import type { ExecutionEngine } from '../execution/engine.js';

export function createApp(catalog: Catalog, engine: ExecutionEngine): Hono {
  const app = new Hono();

  app.use('*', cors());
  app.onError(errorHandler);

  app.route('', healthRoutes(catalog));
  app.route('', agentRoutes(catalog));
  app.route('', executeRoutes(catalog, engine));

  return app;
}
