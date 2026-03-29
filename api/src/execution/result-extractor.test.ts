import { describe, it, expect } from 'vitest';
import { extractResult } from './result-extractor.js';

describe('extractResult', () => {
  it('extracts JSON from <result> tags', () => {
    const text = `Here is my analysis.

<result>
{"score": 0.8, "risks": ["no champion"]}
</result>`;

    const result = extractResult(text);
    expect(result).toEqual({ score: 0.8, risks: ['no champion'] });
  });

  it('returns raw text wrapper when no <result> tags found', () => {
    const text = 'Just a plain response with no structured output.';
    const result = extractResult(text);
    expect(result).toEqual({ analysis: text });
  });

  it('handles malformed JSON inside <result> tags', () => {
    const text = '<result>\nnot valid json\n</result>';
    const result = extractResult(text);
    expect(result).toEqual({ analysis: text });
  });

  it('extracts only the first <result> block', () => {
    const text = `First block:
<result>{"a": 1}</result>
Second block:
<result>{"b": 2}</result>`;

    const result = extractResult(text);
    expect(result).toEqual({ a: 1 });
  });

  it('handles multiline JSON in <result> tags', () => {
    const text = `Analysis complete.

<result>
{
  "qualification_score": 0.65,
  "risks": [
    "No champion identified",
    "Budget unclear"
  ],
  "next_steps": ["Schedule discovery call"]
}
</result>`;

    const result = extractResult(text);
    expect(result.qualification_score).toBe(0.65);
    expect(result.risks).toHaveLength(2);
  });
});
