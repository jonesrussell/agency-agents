export interface AgentEntry {
  slug: string;
  name: string;
  division: string;
  specialty: string;
  whenToUse: string;
  emoji: string;
  promptPath: string;
  promptContent: string;
}

export interface AgentSummary {
  slug: string;
  name: string;
  division: string;
  specialty: string;
  whenToUse: string;
  emoji: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export class AgentApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AgentApiError';
  }

  toJSON(): { error: ApiError } {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export interface ExecutionResult {
  version: 'v1';
  agent: string;
  task: string;
  result: Record<string, unknown>;
  metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  model: string;
  tokens_in: number;
  tokens_out: number;
  duration_ms: number;
  execution_id: string;
}

export interface ExecutionConfig {
  default_model: string;
  max_tokens: number;
  temperature: number;
  timeout_ms: number;
  allowed_models?: string[];
  agent_overrides: Record<
    string,
    Partial<Omit<ExecutionConfig, 'agent_overrides'>>
  >;
}

export interface AppConfig {
  port: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  prompts_dir: string;
  allowed_origins?: string[];
  execution: ExecutionConfig;
}
