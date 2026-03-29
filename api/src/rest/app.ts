import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { log } from '../observability/logger.js';
import { errorHandler } from './error-handler.js';
import { healthRoutes } from './health.js';
import { agentRoutes } from './agents.js';
import { executeRoutes } from './execute.js';
import type { Catalog } from '../catalog/catalog.js';
import type { ExecutionEngine } from '../execution/engine.js';
import type { AppConfig } from '../types.js';

export function createApp(catalog: Catalog, engine: ExecutionEngine, config?: AppConfig): Hono {
  const app = new Hono();

  if (config?.allowed_origins && config.allowed_origins.length > 0) {
    app.use('*', cors({ origin: config.allowed_origins }));
  } else {
    log('warn', 'cors_wildcard', { message: 'ALLOWED_ORIGINS not set, CORS is open to all origins' });
    app.use('*', cors());
  }
  app.onError(errorHandler);

  app.route('', healthRoutes(catalog));
  app.route('', agentRoutes(catalog));
  app.route('', executeRoutes(catalog, engine, config));

  return app;
}
