import { describe, expect, it } from 'vitest';
import { esc, sanitizeForJS } from './sanitize';

describe('sanitizeForJS', () => {
  it('converts full-width numbers and latin characters to half-width', () => {
    const input = 'ＡＢＣ１２３ｘｙｚ';
    const output = sanitizeForJS(input);
    expect(output).toBe('ABC123xyz');
  });

  it('removes control characters', () => {
    const input = 'Hello\x00\x1FWorld\x7F';
    const output = sanitizeForJS(input);
    expect(output).toBe('HelloWorld');
  });

  it('limits length to 255 characters', () => {
    const longStr = 'a'.repeat(300);
    const output = sanitizeForJS(longStr);
    expect(output.length).toBe(255);
  });

  it('handles empty or falsy inputs', () => {
    expect(sanitizeForJS('')).toBe('');
  });
});

describe('esc (XML escape)', () => {
  it('escapes XML special characters', () => {
    expect(esc('<tag>&"\'</tag>')).toBe('&lt;tag&gt;&amp;&quot;&apos;&lt;/tag&gt;');
  });

  it('returns empty string for null or undefined', () => {
    expect(esc(undefined)).toBe('');
    expect(esc(null as unknown as string)).toBe('');
  });

  it('handles numbers correctly', () => {
    expect(esc(123)).toBe('123');
  });
});
