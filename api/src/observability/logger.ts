type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function log(
  level: LogLevel,
  event: string,
  data: Record<string, unknown> = {},
): void {
  if (LEVELS[level] < LEVELS[minLevel]) return;

  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}
