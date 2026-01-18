/**
 * Unit tests for lib/utils.ts
 * Tests utility functions: cn, formatDisplayName, slugify
 */

import { cn, formatDisplayName, slugify } from '@/lib/utils';

describe('cn (className merger)', () => {
  it('merges multiple class names', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles conflicting Tailwind classes by using the last one', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('filters out falsy values', () => {
    const result = cn('base', false, null, undefined, '', 'valid');
    expect(result).toBe('base valid');
  });

  it('handles arrays of classes', () => {
    const result = cn(['class-a', 'class-b'], 'class-c');
    expect(result).toBe('class-a class-b class-c');
  });

  it('handles object syntax', () => {
    const result = cn({ 'text-red': true, 'text-blue': false });
    expect(result).toBe('text-red');
  });

  it('returns empty string for no inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('merges padding classes correctly', () => {
    const result = cn('p-4', 'px-2');
    expect(result).toBe('p-4 px-2');
  });
});

describe('formatDisplayName', () => {
  it('returns "Anonymous User" for null input', () => {
    expect(formatDisplayName(null)).toBe('Anonymous User');
  });

  it('returns "Anonymous User" for undefined input', () => {
    expect(formatDisplayName(undefined)).toBe('Anonymous User');
  });

  it('returns "Anonymous User" for empty string', () => {
    expect(formatDisplayName('')).toBe('Anonymous User');
  });

  it('returns empty string for whitespace only (trims to empty)', () => {
    // The function trims first, which results in empty nameParts[0]
    // This is an edge case - whitespace-only input becomes ""
    expect(formatDisplayName('   ')).toBe('');
  });

  it('returns single name as-is', () => {
    expect(formatDisplayName('John')).toBe('John');
  });

  it('formats two-part name with last initial', () => {
    expect(formatDisplayName('John Doe')).toBe('John D.');
  });

  it('formats multi-part name with last initial', () => {
    expect(formatDisplayName('John Paul Smith')).toBe('John S.');
  });

  it('handles extra whitespace', () => {
    expect(formatDisplayName('  John   Doe  ')).toBe('John D.');
  });

  it('handles names with middle initial', () => {
    expect(formatDisplayName('John P. Smith')).toBe('John S.');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });

  it('handles multiple spaces', () => {
    expect(slugify('foo    bar')).toBe('foo-bar');
  });

  it('preserves numbers', () => {
    expect(slugify('Dance Class 101')).toBe('dance-class-101');
  });

  it('handles underscores', () => {
    expect(slugify('hello_world')).toBe('hello_world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('handles accented characters by removing them', () => {
    expect(slugify('café résumé')).toBe('caf-rsum');
  });

  it('handles mixed case and special chars', () => {
    expect(slugify('My Dance Community!')).toBe('my-dance-community');
  });
});
