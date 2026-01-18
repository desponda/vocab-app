import { describe, it, expect } from 'vitest';
import { generateRandomCode } from './classroom-code';

describe('classroom-code', () => {
  it('should generate 6-character codes', () => {
    const code = generateRandomCode();
    expect(code).toHaveLength(6);
  });

  it('should generate codes with 3 letters and 3 digits', () => {
    const code = generateRandomCode();
    const letters = code.slice(0, 3);
    const digits = code.slice(3, 6);

    // Check that first 3 are uppercase letters (excluding I, O)
    expect(/^[A-HJ-NP-Z]{3}$/.test(letters)).toBe(true);

    // Check that last 3 are digits (excluding 0, 1)
    expect(/^[2-9]{3}$/.test(digits)).toBe(true);
  });

  it('should generate unique codes', () => {
    const codes = new Set();

    for (let i = 0; i < 100; i++) {
      codes.add(generateRandomCode());
    }

    // Should have at least 90 unique codes out of 100 (allowing some collisions)
    expect(codes.size).toBeGreaterThan(90);
  });

  it('should not include confusing characters', () => {
    const codes = [];

    for (let i = 0; i < 50; i++) {
      codes.push(generateRandomCode());
    }

    // Check that none contain I, O, 0, or 1
    const combined = codes.join('');
    expect(combined).not.toContain('I');
    expect(combined).not.toContain('O');
    expect(combined).not.toContain('0');
    expect(combined).not.toContain('1');
  });

  it('should generate codes in correct format', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateRandomCode();

      // Should match format: 3 letters + 3 digits
      expect(/^[A-HJ-NP-Z]{3}[2-9]{3}$/.test(code)).toBe(true);
    }
  });
});
