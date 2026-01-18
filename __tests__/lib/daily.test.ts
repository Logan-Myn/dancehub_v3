/**
 * Unit tests for lib/daily.ts
 * Tests pure utility functions: generateRoomName, calculateRoomExpiration
 */

import { generateRoomName, calculateRoomExpiration } from '@/lib/daily';

describe('generateRoomName', () => {
  it('generates a room name with correct format', () => {
    const bookingId = '12345678-abcd-efgh-ijkl-mnopqrstuvwx';
    const communitySlug = 'dance-studio';

    const result = generateRoomName(bookingId, communitySlug);

    // Should start with community slug
    expect(result).toMatch(/^dance-studio-/);
    // Should contain first 8 chars of booking ID
    expect(result).toContain('12345678');
  });

  it('truncates booking ID to first 8 characters', () => {
    const bookingId = 'abcdefghijklmnop';
    const communitySlug = 'studio';

    const result = generateRoomName(bookingId, communitySlug);

    expect(result).toContain('abcdefgh');
    expect(result).not.toContain('ijklmnop');
  });

  it('includes a random suffix', () => {
    const bookingId = '12345678';
    const communitySlug = 'studio';

    const result1 = generateRoomName(bookingId, communitySlug);
    const result2 = generateRoomName(bookingId, communitySlug);

    // Random suffixes should make them different
    expect(result1).not.toBe(result2);
  });

  it('follows the pattern: slug-shortId-random', () => {
    const bookingId = '12345678-1234';
    const communitySlug = 'my-studio';

    const result = generateRoomName(bookingId, communitySlug);
    const parts = result.split('-');

    // my-studio-12345678-random
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts[0]).toBe('my');
    expect(parts[1]).toBe('studio');
    expect(parts[2]).toBe('12345678');
  });

  it('handles short booking IDs', () => {
    const bookingId = 'abc';
    const communitySlug = 'studio';

    const result = generateRoomName(bookingId, communitySlug);

    expect(result).toContain('abc');
    expect(result).toMatch(/^studio-abc-/);
  });

  it('handles empty community slug', () => {
    const bookingId = '12345678';
    const communitySlug = '';

    const result = generateRoomName(bookingId, communitySlug);

    expect(result).toMatch(/^-12345678-/);
  });
});

describe('calculateRoomExpiration', () => {
  beforeEach(() => {
    // Mock Date.now() to return a fixed timestamp
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates expiration from current time when no scheduledAt', () => {
    const durationMinutes = 60;

    const result = calculateRoomExpiration(durationMinutes);

    // Current time: 2025-01-15T12:00:00Z = 1736942400
    // + 60 minutes + 30 buffer = 90 minutes = 5400 seconds
    const expectedTimestamp = Math.floor(new Date('2025-01-15T12:00:00Z').getTime() / 1000) + (90 * 60);
    expect(result).toBe(expectedTimestamp);
  });

  it('adds 30 minute buffer to lesson duration', () => {
    const durationMinutes = 30;

    const result = calculateRoomExpiration(durationMinutes);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 30 min lesson + 30 min buffer = 60 minutes = 3600 seconds
    expect(result).toBe(currentTimestamp + 3600);
  });

  it('calculates expiration from scheduledAt when provided', () => {
    const durationMinutes = 60;
    const scheduledAt = '2025-01-15T14:00:00Z';

    const result = calculateRoomExpiration(durationMinutes, scheduledAt);

    // Scheduled time: 2025-01-15T14:00:00Z
    // + 60 minutes + 30 buffer = 90 minutes
    const scheduledTimestamp = new Date(scheduledAt).getTime() / 1000;
    const expectedTimestamp = scheduledTimestamp + (90 * 60);
    expect(result).toBe(expectedTimestamp);
  });

  it('handles null scheduledAt like undefined', () => {
    const durationMinutes = 45;

    const result = calculateRoomExpiration(durationMinutes, null);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 45 min + 30 min buffer = 75 minutes = 4500 seconds
    expect(result).toBe(currentTimestamp + 4500);
  });

  it('handles zero duration lessons', () => {
    const durationMinutes = 0;

    const result = calculateRoomExpiration(durationMinutes);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 0 min + 30 min buffer = 30 minutes = 1800 seconds
    expect(result).toBe(currentTimestamp + 1800);
  });

  it('handles very long lessons', () => {
    const durationMinutes = 180; // 3 hours

    const result = calculateRoomExpiration(durationMinutes);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 180 min + 30 min buffer = 210 minutes = 12600 seconds
    expect(result).toBe(currentTimestamp + 12600);
  });

  it('returns unix timestamp (seconds, not milliseconds)', () => {
    const durationMinutes = 60;

    const result = calculateRoomExpiration(durationMinutes);

    // Unix timestamps in seconds are around 1.7 billion in 2025
    // Milliseconds would be around 1.7 trillion
    expect(result).toBeLessThan(2000000000);
    expect(result).toBeGreaterThan(1700000000);
  });
});
