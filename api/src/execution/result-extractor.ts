const RESULT_PATTERN = /<result>\s*([\s\S]*?)\s*<\/result>/i;

export function extractResult(text: string): Record<string, unknown> {
  const match = RESULT_PATTERN.exec(text);

  if (!match) {
    return { analysis: text };
  }

  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return { analysis: text };
  }
}
