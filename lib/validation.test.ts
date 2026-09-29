import { describe, expect, it } from 'vitest';
import { TITLE_MAX_LENGTH, validateTitle } from './validation';

describe('validateTitle', () => {
  it('trims surrounding whitespace and returns the trimmed value', () => {
    expect(validateTitle('  Buy milk  ')).toEqual({ ok: true, value: 'Buy milk' });
  });

  it('rejects an empty title', () => {
    expect(validateTitle('')).toEqual({ ok: false, error: 'Title is required' });
  });

  it('rejects a whitespace-only title', () => {
    expect(validateTitle('   ')).toEqual({ ok: false, error: 'Title is required' });
  });

  it('accepts a title of exactly the max length', () => {
    const value = 'a'.repeat(TITLE_MAX_LENGTH);
    expect(validateTitle(value)).toEqual({ ok: true, value });
  });

  it('rejects a title longer than the max length', () => {
    const result = validateTitle('a'.repeat(TITLE_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});
