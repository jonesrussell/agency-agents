import { serve } from '@hono/node-server';
import { resolve } from 'path';
import { loadConfig } from './config.js';
import { scanPrompts } from './catalog/scanner.js';
import { Catalog } from './catalog/catalog.js';
import { ExecutionEngine } from './execution/engine.js';
import { setLogLevel, log } from './observability/logger.js';
import { ConsoleMetricsEmitter } from './observability/metrics.js';

const mode = process.argv[2]; // 'rest', 'mcp', or undefined (defaults to rest)

async function main(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.log_level);

  const promptsDir = resolve(import.meta.dirname, '..', config.prompts_dir);
  log('info', 'scanning_prompts', { dir: promptsDir });

  const entries = await scanPrompts(promptsDir);
  const catalog = new Catalog(entries);
  log('info', 'catalog_ready', { agents: catalog.count });

  const metrics = new ConsoleMetricsEmitter();
  const engine = new ExecutionEngine(config.execution, metrics);

  if (mode === 'mcp') {
    // MCP mode imports dynamically to avoid loading REST deps
    const { startMcpServer } = await import('./mcp/server.js');
    log('info', 'starting_mcp_server');
    await startMcpServer(catalog, engine);
  } else {
    // REST mode imports dynamically to avoid loading MCP deps
    const { createApp } = await import('./rest/app.js');
    const app = createApp(catalog, engine, config);
    log('info', 'starting_rest_server', { port: config.port });
    serve({ fetch: app.fetch, port: config.port });
    log('info', 'server_ready', { port: config.port, agents: catalog.count });
  }
}

main().catch((err) => {
  log('error', 'startup_failed', { message: String(err) });
  process.exit(1);
});
