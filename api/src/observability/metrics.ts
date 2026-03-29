export interface MetricsEmitter {
  executionComplete(data: {
    agent: string;
    model: string;
    tokens_in: number;
    tokens_out: number;
    duration_ms: number;
    status: 'success' | 'error';
  }): void;
}

export class ConsoleMetricsEmitter implements MetricsEmitter {
  executionComplete(data: {
    agent: string;
    model: string;
    tokens_in: number;
    tokens_out: number;
    duration_ms: number;
    status: 'success' | 'error';
  }): void {
    const entry = {
      level: 'info',
      event: 'execution_complete',
      timestamp: new Date().toISOString(),
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
