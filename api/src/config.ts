import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';
import { log } from './observability/logger.js';
import type { AppConfig } from './types.js';

export function loadConfig(): AppConfig {
  const configPath =
    process.env.CONFIG_PATH ??
    join(import.meta.dirname, '..', 'config.default.yaml');

  const raw = readFileSync(configPath, 'utf-8');
  const file = parse(raw) as Partial<AppConfig>;

  // Issue #8: Validate LOG_LEVEL against known values
  const validLevels = new Set(['debug', 'info', 'warn', 'error']);
  const rawLevel = process.env.LOG_LEVEL ?? file.log_level ?? 'info';
  const log_level = validLevels.has(rawLevel) ? rawLevel as AppConfig['log_level'] : 'info';

  // Issue #4: Parse ALLOWED_ORIGINS from comma-separated env var
  const allowed_origins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : undefined;

  return {
    port: parseInt(process.env.PORT ?? String(file.port ?? 3100), 10),
    log_level,
    prompts_dir: process.env.PROMPTS_DIR ?? file.prompts_dir ?? '..',
    allowed_origins,
    execution: {
      default_model:
        process.env.DEFAULT_MODEL ??
        file.execution?.default_model ??
        'claude-sonnet-4-6',
      max_tokens: file.execution?.max_tokens ?? 4096,
      temperature: file.execution?.temperature ?? 0.7,
      timeout_ms: file.execution?.timeout_ms ?? 60000,
      allowed_models: file.execution?.allowed_models ?? [],
      agent_overrides: file.execution?.agent_overrides ?? {},
    },
  };
}
