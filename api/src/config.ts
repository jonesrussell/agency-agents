import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';
import type { AppConfig } from './types.js';

export function loadConfig(): AppConfig {
  const configPath =
    process.env.CONFIG_PATH ??
    join(import.meta.dirname, '..', 'config.default.yaml');

  const raw = readFileSync(configPath, 'utf-8');
  const file = parse(raw) as Partial<AppConfig>;

  return {
    port: parseInt(process.env.PORT ?? String(file.port ?? 3100), 10),
    log_level: (process.env.LOG_LEVEL ?? file.log_level ?? 'info') as AppConfig['log_level'],
    prompts_dir: process.env.PROMPTS_DIR ?? file.prompts_dir ?? '..',
    execution: {
      default_model:
        process.env.DEFAULT_MODEL ??
        file.execution?.default_model ??
        'claude-sonnet-4-6',
      max_tokens: file.execution?.max_tokens ?? 4096,
      temperature: file.execution?.temperature ?? 0.7,
      timeout_ms: file.execution?.timeout_ms ?? 60000,
      agent_overrides: file.execution?.agent_overrides ?? {},
    },
  };
}
