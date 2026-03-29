import type { Context } from 'hono';
import { AgentApiError } from '../types.js';

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AgentApiError) {
    return c.json(err.toJSON(), err.statusCode as 400 | 404 | 422 | 500);
  }

  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: err.message, details: {} } },
    500,
  );
}
