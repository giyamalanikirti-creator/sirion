import { describe, expect, it } from 'vitest';
import { wordDiff } from '@/lib/diff';

describe('wordDiff', () => {
  it('marks changed words', () => {
    const d = wordDiff('gives thirty (30) days notice', 'gives ninety (90) days notice');
    expect(d.filter((p) => p.type === 'del').map((p) => p.text.trim()).join(' ')).toContain('thirty');
    expect(d.filter((p) => p.type === 'ins').map((p) => p.text.trim()).join(' ')).toContain('ninety');
    expect(d.filter((p) => p.type !== 'ins').map((p) => p.text).join('')).toBe('gives thirty (30) days notice');
    expect(d.filter((p) => p.type !== 'del').map((p) => p.text).join('')).toBe('gives ninety (90) days notice');
  });
});
