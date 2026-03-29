import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Catalog } from '../catalog/catalog.js';
import type { ExecutionEngine } from '../execution/engine.js';

interface McpToolContent {
  type: 'text';
  text: string;
}

interface McpToolResponse {
  content: McpToolContent[];
  isError?: boolean;
}

interface McpToolDefinition {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<McpToolResponse>;
}

function jsonResponse(data: unknown): McpToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResponse(code: string, message: string): McpToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify({ code, message }) }],
    isError: true,
  };
}

export function createMcpTools(
  catalog: Catalog,
  engine: Pick<ExecutionEngine, 'execute'>,
): McpToolDefinition[] {
  return [
    {
      name: 'list_agents',
      handler: async (args) => {
        const division = args.division as string | undefined;
        const query = args.query as string | undefined;
        const result = catalog.list({ division, q: query });
        return jsonResponse(result);
      },
    },
    {
      name: 'execute_agent',
      handler: async (args) => {
        const slug = args.agent as string;
        const task = args.task as string;
        const context = (args.context as Record<string, unknown>) ?? {};

        const agent = catalog.get(slug);
        if (!agent) {
          return errorResponse('AGENT_NOT_FOUND', `No agent found with slug: ${slug}`);
        }

        try {
          const result = await engine.execute(agent, task, context);
          return jsonResponse(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return errorResponse('EXECUTION_FAILED', message);
        }
      },
    },
    {
      name: 'get_agent_prompt',
      handler: async (args) => {
        const slug = args.agent as string;
        const agent = catalog.get(slug);
        if (!agent) {
          return errorResponse('AGENT_NOT_FOUND', `No agent found with slug: ${slug}`);
        }
        return {
          content: [{ type: 'text' as const, text: agent.promptContent }],
        };
      },
    },
  ];
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  list_agents: 'List available specialist agents, optionally filtered by division or search query',
  execute_agent: 'Execute a specialist agent on a task and return structured results',
  get_agent_prompt: 'Get the raw system prompt for a specialist agent',
};

const TOOL_SCHEMAS = {
  list_agents: {
    division: z.string().optional().describe('Filter by division name'),
    query: z.string().optional().describe('Search agents by name, specialty, or use case'),
  },
  execute_agent: {
    agent: z.string().describe('Agent slug identifier'),
    task: z.string().describe('Task description for the agent'),
    context: z.record(z.unknown()).optional().describe('Additional context for the agent'),
  },
  get_agent_prompt: {
    agent: z.string().describe('Agent slug identifier'),
  },
} as const;

export function createMcpServer(
  catalog: Catalog,
  engine: Pick<ExecutionEngine, 'execute'>,
): McpServer {
  const server = new McpServer({
    name: 'agency-agents',
    version: '0.1.0',
  });

  const tools = createMcpTools(catalog, engine);
  for (const tool of tools) {
    const schema = TOOL_SCHEMAS[tool.name as keyof typeof TOOL_SCHEMAS];
    const description = TOOL_DESCRIPTIONS[tool.name];
    server.tool(tool.name, description, schema, (args) => tool.handler(args));
  }

  return server;
}

export async function startMcpServer(
  catalog: Catalog,
  engine: Pick<ExecutionEngine, 'execute'>,
): Promise<void> {
  const server = createMcpServer(catalog, engine);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
